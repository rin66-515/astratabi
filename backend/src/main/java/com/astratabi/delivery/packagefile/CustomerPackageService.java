package com.astratabi.delivery.packagefile;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.common.SecretHash;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.delivery.DeliveryStatus;
import com.astratabi.delivery.delivery.PortalDelivery;
import com.astratabi.delivery.delivery.PortalDeliveryToken;
import com.astratabi.delivery.delivery.PortalDeliveryTokenRepository;
import com.astratabi.delivery.provisioning.AsrayProvisioningService;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.hssf.record.crypto.Biff8EncryptionKey;
import org.apache.poi.poifs.crypt.EncryptionInfo;
import org.apache.poi.poifs.crypt.EncryptionMode;
import org.apache.poi.poifs.crypt.Encryptor;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Service
public class CustomerPackageService {
    private static final Pattern HAS_LETTER = Pattern.compile(".*[A-Za-z].*");
    private static final Pattern HAS_DIGIT = Pattern.compile(".*[0-9].*");

    private final PortalDeliveryTokenRepository tokenRepository;
    private final PortalDeliveryPackageRepository packageRepository;
    private final PackageReleaseService releaseService;
    private final AsrayProvisioningService provisioningService;
    private final AuditService auditService;
    private final PortalProperties properties;

    public CustomerPackageService(
            PortalDeliveryTokenRepository tokenRepository,
            PortalDeliveryPackageRepository packageRepository,
            PackageReleaseService releaseService,
            AsrayProvisioningService provisioningService,
            AuditService auditService,
            PortalProperties properties) {
        this.tokenRepository = tokenRepository;
        this.packageRepository = packageRepository;
        this.releaseService = releaseService;
        this.provisioningService = provisioningService;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public GenerationResponse setPasswordAndGenerate(
            String rawToken, PasswordRequest request) {
        validatePassword(request);
        PortalDeliveryToken token = findToken(rawToken);
        PortalDelivery delivery = token.delivery();
        if (!token.active() || delivery.status() == DeliveryStatus.REVOKED
                || delivery.status() == DeliveryStatus.CANCELLED) {
            throw notFound();
        }
        if (delivery.expiresAt() != null && !delivery.expiresAt().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.GONE, "DELIVERY_EXPIRED", "この交付リンクの有効期限は終了しました。");
        }
        PortalDeliveryPackage customerPackage = packageRepository
                .findByDeliveryIdForUpdate(delivery.id())
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                        "DELIVERY_PACKAGE_NOT_INITIALIZED", "交付資料の準備情報がありません。"));

        if (customerPackage.generationStatus() != DeliveryPackageStatus.READY) {
            generate(customerPackage, request.password().toCharArray());
        }

        AsrayProvisioningService.ProvisioningResult provisioning = provisioningService.provision(
                delivery, request.password());
        delivery.markIssued(Instant.now());
        token.markUsed(Instant.now());
        auditService.record("CUSTOMER", delivery.customer().customerCode(),
                "CUSTOMER_PACKAGE_READY", "DELIVERY", delivery.id().toString(), null,
                "{\"fileName\":\"" + customerPackage.deliveredFileName()
                        + "\",\"sha256\":\"" + customerPackage.deliveredSha256()
                        + "\",\"encryptedWorkbookCount\":"
                        + customerPackage.encryptedWorkbookCount() + "}");
        return new GenerationResponse(
                "READY",
                customerPackage.deliveredFileName(),
                customerPackage.deliveredSha256(),
                customerPackage.encryptedWorkbookCount(),
                provisioning.userId(),
                provisioning.status());
    }

    private void generate(PortalDeliveryPackage state, char[] password) {
        Instant now = Instant.now();
        state.begin(now);
        packageRepository.saveAndFlush(state);
        PortalDelivery delivery = state.delivery();
        Path root = storageRoot();
        Path staging = root.resolve(".staging");
        Path stagedZip = null;
        try {
            Files.createDirectories(staging);
            stagedZip = Files.createTempFile(staging, "delivery-", ".zip");
            Path master = releaseService.masterArchivePath(delivery.packageRelease());
            int encryptedCount = buildCustomerArchive(
                    master, stagedZip, password, delivery.watermarkText(), staging);
            String sha256 = sha256(stagedZip);
            String fileName = customerFileName(delivery);
            String storageKey = "deliveries/" + delivery.deliveryNo() + "/"
                    + sha256.substring(0, 12) + "/" + fileName;
            Path finalFile = resolveStorageKey(storageKey);
            Files.createDirectories(finalFile.getParent());
            if (!Files.exists(finalFile)) {
                move(stagedZip, finalFile);
                stagedZip = null;
            }
            state.ready(storageKey, fileName, sha256, Files.size(finalFile), encryptedCount, Instant.now());
            packageRepository.saveAndFlush(state);
        } catch (ApiException exception) {
            state.failed(exception.code(), Instant.now());
            throw exception;
        } catch (RuntimeException | IOException exception) {
            state.failed("CUSTOMER_PACKAGE_GENERATION_FAILED", Instant.now());
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "CUSTOMER_PACKAGE_GENERATION_FAILED", "客户专属资料包生成失败。请联系客户支持。");
        } finally {
            java.util.Arrays.fill(password, '\0');
            deleteQuietly(stagedZip);
        }
    }

    private int buildCustomerArchive(
            Path source, Path destination, char[] password, String watermark, Path staging) throws IOException {
        int encryptedCount = 0;
        Set<String> entryNames = new HashSet<>();
        try (ZipInputStream input = new ZipInputStream(Files.newInputStream(source), StandardCharsets.UTF_8);
             ZipOutputStream output = new ZipOutputStream(Files.newOutputStream(destination), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                String entryName = safeEntryName(entry.getName());
                if (!entryNames.add(entryName)) {
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "MASTER_PACKAGE_DUPLICATE_ENTRY", "母版资料包中存在重复文件名。");
                }
                if (entry.isDirectory()) {
                    output.putNextEntry(new ZipEntry(entryName.endsWith("/") ? entryName : entryName + "/"));
                    output.closeEntry();
                    continue;
                }
                output.putNextEntry(new ZipEntry(entryName));
                if (entryName.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
                    Path plain = Files.createTempFile(staging, "workbook-", ".xlsx");
                    Path encrypted = Files.createTempFile(staging, "workbook-encrypted-", ".xlsx");
                    try {
                        copyLimited(input, plain);
                        encryptWorkbook(plain, encrypted, password, watermark);
                        Files.copy(encrypted, output);
                        encryptedCount++;
                    } finally {
                        deleteQuietly(plain);
                        deleteQuietly(encrypted);
                    }
                } else {
                    copyLimited(input, output);
                }
                output.closeEntry();
            }
            String guideName = entryNames.contains("ASRAY_交付案内.txt")
                    ? "ASRAY_交付案内_顧客別.txt" : "ASRAY_交付案内.txt";
            ZipEntry guide = new ZipEntry(guideName);
            output.putNextEntry(guide);
            output.write(("交付管理用ウォーターマーク: " + watermark + System.lineSeparator()
                    + "Excel ファイルはお客様が設定したパスワードで暗号化されています。"
                    + System.lineSeparator()).getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        return encryptedCount;
    }

    private void encryptWorkbook(
            Path source, Path destination, char[] password, String watermark) throws IOException {
        Biff8EncryptionKey.setCurrentUserPassword(null);
        try (Workbook workbook = WorkbookFactory.create(source.toFile());
             POIFSFileSystem fileSystem = new POIFSFileSystem()) {
            for (Sheet sheet : workbook) {
                sheet.getFooter().setCenter(watermark);
            }
            EncryptionInfo info = new EncryptionInfo(EncryptionMode.agile);
            Encryptor encryptor = info.getEncryptor();
            encryptor.confirmPassword(new String(password));
            try (OutputStream encryptedData = encryptor.getDataStream(fileSystem)) {
                workbook.write(encryptedData);
            }
            try (OutputStream file = Files.newOutputStream(destination)) {
                fileSystem.writeFilesystem(file);
            }
        } catch (EncryptedDocumentException exception) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "MASTER_WORKBOOK_ALREADY_ENCRYPTED", "母版中包含无法处理的已加密 Excel 文件。");
        } catch (java.security.GeneralSecurityException exception) {
            throw new IOException("Workbook encryption failed", exception);
        }
    }

    private void copyLimited(InputStream input, Path destination) throws IOException {
        try (OutputStream output = Files.newOutputStream(destination)) {
            copyLimited(input, output);
        }
    }

    private void copyLimited(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[8192];
        long total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > properties.packageStorage().maxUncompressedBytes()) {
                throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE,
                        "PACKAGE_ENTRY_TOO_LARGE", "资料包内文件超过允许大小。");
            }
            output.write(buffer, 0, read);
        }
    }

    private PortalDeliveryToken findToken(String rawToken) {
        if (rawToken == null || rawToken.length() < 32) throw notFound();
        return tokenRepository.findDetailByTokenHash(SecretHash.sha256(
                rawToken, properties.security().tokenPepper() == null
                        ? "" : properties.security().tokenPepper())).orElseThrow(this::notFound);
    }

    private void validatePassword(PasswordRequest request) {
        String password = request == null ? null : request.password();
        boolean visibleAscii = password != null && password.chars().allMatch(value -> value >= 0x21 && value <= 0x7e);
        if (!visibleAscii || password.length() < 12 || password.length() > 64
                || !HAS_LETTER.matcher(password).matches() || !HAS_DIGIT.matcher(password).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_PASSWORD_POLICY_VIOLATION",
                    "密码须为 12～64 位可见半角字符，并至少包含英文字母和数字。");
        }
        if (!password.equals(request.passwordConfirmation())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DOCUMENT_PASSWORD_CONFIRMATION_MISMATCH",
                    "两次输入的资料密码不一致。");
        }
    }

    private String customerFileName(PortalDelivery delivery) {
        String source = delivery.packageRelease().fileName();
        String base = source.toLowerCase(Locale.ROOT).endsWith(".zip")
                ? source.substring(0, source.length() - 4) : source;
        return base + "_" + delivery.deliveryNo() + ".zip";
    }

    private String safeEntryName(String value) {
        String normalized = value == null ? "" : value.replace('\\', '/');
        Path path = Path.of(normalized).normalize();
        if (normalized.isBlank() || normalized.startsWith("/") || path.isAbsolute() || path.startsWith("..")) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "PACKAGE_ZIP_PATH_INVALID", "资料包内存在不安全路径。");
        }
        return path.toString().replace('\\', '/');
    }

    private Path storageRoot() {
        return Path.of(properties.packageStorage().root()).toAbsolutePath().normalize();
    }

    private Path resolveStorageKey(String storageKey) {
        Path root = storageRoot();
        Path value = root.resolve(storageKey.replace('/', java.io.File.separatorChar)).normalize();
        if (!value.startsWith(root)) throw new IllegalStateException("Storage key escaped root");
        return value;
    }

    private String sha256(Path path) throws IOException {
        try (InputStream input = Files.newInputStream(path)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private void move(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, target);
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) return;
        try { Files.deleteIfExists(path); } catch (IOException ignored) { }
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_NOT_FOUND", "有効な受取情報を確認できませんでした。");
    }

    public record PasswordRequest(String password, String passwordConfirmation) {
    }

    public record GenerationResponse(
            String state,
            String fileName,
            String sha256,
            int encryptedWorkbookCount,
            String asrayUserId,
            String asrayAccountStatus) {
    }
}
