package com.astratabi.delivery.packagefile;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.config.PortalProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class PackageReleaseService {

    private static final String PROJECT_CODE = "ASRAY";
    private static final int CHECKSUM_FILE_LIMIT = 8192;
    private static final long ZIP_RATIO_CHECK_THRESHOLD = 20L * 1024 * 1024;
    private static final long MAX_COMPRESSION_RATIO = 100;

    private final PortalPackageReleaseRepository repository;
    private final AuditService auditService;
    private final PortalProperties properties;

    public PackageReleaseService(PortalPackageReleaseRepository repository, AuditService auditService, PortalProperties properties) {
        this.repository = repository;
        this.auditService = auditService;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<PackageReleaseResponse> list(boolean includeArchived) {
        List<PortalPackageRelease> releases = includeArchived
                ? repository.findAllByOrderByReleaseDateDescUploadedAtDesc()
                : repository.findByStatusOrderByReleaseDateDescUploadedAtDesc(PackageReleaseStatus.ACTIVE);
        return releases.stream().map(PackageReleaseResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PortalPackageRelease requireActive(UUID id) {
        PortalPackageRelease release = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PACKAGE_RELEASE_NOT_FOUND", "资料包版本不存在。"));
        if (release.status() != PackageReleaseStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "PACKAGE_RELEASE_ARCHIVED", "已归档的资料包不能用于新交付。");
        }
        return release;
    }

    @Transactional
    public UploadResponse upload(MultipartFile archive, MultipartFile checksum, String actorId) {
        if (archive == null || archive.isEmpty()) {
            throw badRequest("PACKAGE_ARCHIVE_REQUIRED", "请选择 ZIP 资料包。");
        }
        if (checksum == null || checksum.isEmpty()) {
            throw badRequest("PACKAGE_CHECKSUM_REQUIRED", "请选择对应的 .sha256 文件。");
        }
        if (archive.getSize() > properties.packageStorage().maxUploadBytes()) {
            throw badRequest("PACKAGE_TOO_LARGE", "ZIP 资料包超过允许的大小。");
        }
        if (checksum.getSize() > CHECKSUM_FILE_LIMIT) {
            throw badRequest("PACKAGE_CHECKSUM_INVALID", ".sha256 文件内容过大。");
        }

        String fileName = baseFileName(archive.getOriginalFilename());
        String checksumFileName = baseFileName(checksum.getOriginalFilename());
        FilenameParts parts = parseFileName(fileName);
        if (!checksumFileName.equals(fileName + ".sha256")) {
            throw badRequest("PACKAGE_CHECKSUM_NAME_MISMATCH", ".sha256 文件名必须与 ZIP 文件名完全对应。");
        }

        ChecksumParts checksumParts = parseChecksum(checksum, fileName);
        Path storageRoot = storageRoot();
        Path stagingDirectory = storageRoot.resolve(".staging");
        Path stagedArchive = null;
        try {
            Files.createDirectories(stagingDirectory);
            stagedArchive = Files.createTempFile(stagingDirectory, "package-", ".zip");
            String actualSha256 = copyAndHash(archive, stagedArchive);
            if (!actualSha256.equals(checksumParts.sha256())) {
                throw badRequest("PACKAGE_CHECKSUM_MISMATCH", "ZIP 的实际 SHA-256 与校验文件不一致。");
            }
            validateZip(stagedArchive, archive.getSize());

            PortalPackageRelease existingByName = repository.findByFileName(fileName).orElse(null);
            if (existingByName != null) {
                if (existingByName.sha256().equals(actualSha256)) {
                    return new UploadResponse(PackageReleaseResponse.from(existingByName), true);
                }
                throw new ApiException(HttpStatus.CONFLICT, "PACKAGE_RELEASE_IMMUTABLE_CONFLICT", "同名版本已经存在，且文件内容不同，不能覆盖。");
            }
            repository.findByProjectCodeAndVersionAndReleaseDate(PROJECT_CODE, parts.version(), parts.releaseDate())
                    .ifPresent(existing -> {
                        throw new ApiException(HttpStatus.CONFLICT, "PACKAGE_RELEASE_VERSION_CONFLICT", "同一版本和发布日期已经登记，不能替换。");
                    });

            String directoryKey = "packages/" + PROJECT_CODE.toLowerCase(Locale.ROOT) + "/v" + parts.version()
                    + "/" + parts.releaseDate().format(DateTimeFormatter.BASIC_ISO_DATE) + "/" + actualSha256.substring(0, 12);
            String archiveKey = directoryKey + "/" + fileName;
            String checksumKey = archiveKey + ".sha256";
            Path finalArchive = resolveStorageKey(storageRoot, archiveKey);
            Path finalChecksum = resolveStorageKey(storageRoot, checksumKey);
            Files.createDirectories(finalArchive.getParent());
            if (Files.exists(finalArchive) || Files.exists(finalChecksum)) {
                throw new ApiException(HttpStatus.CONFLICT, "PACKAGE_RELEASE_FILE_EXISTS", "同名资料包文件已经存在，不能覆盖。");
            }
            moveImmutable(stagedArchive, finalArchive);
            stagedArchive = null;

            try {
                Files.writeString(finalChecksum, actualSha256 + "  " + fileName + System.lineSeparator(),
                        StandardCharsets.US_ASCII, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
                PortalPackageRelease saved = repository.saveAndFlush(PortalPackageRelease.create(
                        PROJECT_CODE, parts.baseName(), productId(parts.baseName()), parts.version(), parts.releaseDate(), fileName,
                        archiveKey, checksumKey, actualSha256, Files.size(finalArchive), actorId));
                auditService.record("ADMIN", actorId, "PACKAGE_RELEASE_UPLOADED", "PACKAGE_RELEASE", saved.id().toString(), null,
                        "{\"fileName\":\"" + fileName + "\",\"sha256\":\"" + actualSha256 + "\"}");
                return new UploadResponse(PackageReleaseResponse.from(saved), false);
            } catch (RuntimeException exception) {
                deleteQuietly(finalChecksum);
                deleteQuietly(finalArchive);
                throw exception;
            } catch (IOException exception) {
                deleteQuietly(finalChecksum);
                deleteQuietly(finalArchive);
                throw exception;
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "PACKAGE_STORAGE_ERROR", "资料包保存失败。");
        } finally {
            deleteQuietly(stagedArchive);
        }
    }

    @Transactional
    public PackageReleaseResponse archive(UUID id, String actorId) {
        PortalPackageRelease release = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PACKAGE_RELEASE_NOT_FOUND", "资料包版本不存在。"));
        release.archive(Instant.now());
        auditService.record("ADMIN", actorId, "PACKAGE_RELEASE_ARCHIVED", "PACKAGE_RELEASE", release.id().toString(), null,
                "{\"status\":\"ARCHIVED\"}");
        return PackageReleaseResponse.from(release);
    }

    private FilenameParts parseFileName(String fileName) {
        List<String> configuredBaseNames = List.of(properties.packageStorage().allowedBaseName().split(","))
                .stream().map(String::trim).filter(value -> !value.isBlank()).toList();
        String baseNamePattern = configuredBaseNames.stream().map(Pattern::quote)
                .collect(java.util.stream.Collectors.joining("|"));
        Pattern pattern = Pattern.compile("^(" + baseNamePattern + ")_v(\\d+\\.\\d+\\.\\d+)_(\\d{8})\\.zip$");
        Matcher matcher = pattern.matcher(fileName);
        if (!matcher.matches()) {
            throw badRequest("PACKAGE_FILE_NAME_INVALID", "ZIP 文件名必须符合已登记商品名_v1.0.0_YYYYMMDD.zip。" );
        }
        try {
            return new FilenameParts(matcher.group(1), matcher.group(2), LocalDate.parse(matcher.group(3), DateTimeFormatter.BASIC_ISO_DATE));
        } catch (DateTimeParseException exception) {
            throw badRequest("PACKAGE_RELEASE_DATE_INVALID", "ZIP 文件名中的日期无效。");
        }
    }

    private ChecksumParts parseChecksum(MultipartFile checksum, String expectedFileName) {
        try {
            String content = new String(checksum.getBytes(), StandardCharsets.US_ASCII).trim();
            Matcher matcher = Pattern.compile("(?i)^([a-f0-9]{64})\\s+\\*?(.+)$").matcher(content);
            if (!matcher.matches() || !matcher.group(2).trim().equals(expectedFileName)) {
                throw badRequest("PACKAGE_CHECKSUM_INVALID", ".sha256 内容必须为‘64 位哈希值  ZIP 文件名’。");
            }
            return new ChecksumParts(matcher.group(1).toLowerCase(Locale.ROOT));
        } catch (IOException exception) {
            throw badRequest("PACKAGE_CHECKSUM_INVALID", ".sha256 文件无法读取。");
        }
    }

    private String copyAndHash(MultipartFile archive, Path destination) throws IOException {
        MessageDigest digest = sha256Digest();
        long total = 0;
        byte[] buffer = new byte[8192];
        try (InputStream input = archive.getInputStream(); var output = Files.newOutputStream(destination)) {
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > properties.packageStorage().maxUploadBytes()) {
                    throw badRequest("PACKAGE_TOO_LARGE", "ZIP 资料包超过允许的大小。");
                }
                digest.update(buffer, 0, read);
                output.write(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private void validateZip(Path archive, long compressedSize) {
        int entryCount = 0;
        int fileCount = 0;
        long totalUncompressed = 0;
        Set<String> entryNames = new HashSet<>();
        byte[] buffer = new byte[8192];
        try (ZipInputStream input = new ZipInputStream(Files.newInputStream(archive), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                entryCount++;
                if (entryCount > properties.packageStorage().maxEntryCount()) {
                    throw badRequest("PACKAGE_ZIP_TOO_MANY_ENTRIES", "ZIP 内文件数量超过限制。");
                }
                String normalizedName = normalizeEntryName(entry.getName());
                if (!entryNames.add(normalizedName)) {
                    throw badRequest("PACKAGE_ZIP_DUPLICATE_ENTRY", "ZIP 内存在重复路径。");
                }
                if (entry.isDirectory()) {
                    continue;
                }
                fileCount++;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    totalUncompressed += read;
                    if (totalUncompressed > properties.packageStorage().maxUncompressedBytes()) {
                        throw badRequest("PACKAGE_ZIP_EXPANDED_TOO_LARGE", "ZIP 解压后的总大小超过限制。");
                    }
                }
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (IOException exception) {
            throw badRequest("PACKAGE_ZIP_INVALID", "ZIP 文件损坏或格式无效。");
        }
        if (fileCount == 0) {
            throw badRequest("PACKAGE_ZIP_EMPTY", "ZIP 中没有可交付文件。");
        }
        if (totalUncompressed > ZIP_RATIO_CHECK_THRESHOLD && compressedSize > 0
                && totalUncompressed / compressedSize > MAX_COMPRESSION_RATIO) {
            throw badRequest("PACKAGE_ZIP_COMPRESSION_RATIO_INVALID", "ZIP 压缩比异常，已拒绝上传。");
        }
    }

    private String normalizeEntryName(String entryName) {
        String portableName = entryName == null ? "" : entryName.replace('\\', '/');
        if (portableName.isBlank() || portableName.startsWith("/") || portableName.matches("^[A-Za-z]:.*")) {
            throw badRequest("PACKAGE_ZIP_PATH_INVALID", "ZIP 内存在不安全路径。");
        }
        try {
            Path normalized = Path.of(portableName).normalize();
            if (normalized.isAbsolute() || normalized.startsWith("..")) {
                throw badRequest("PACKAGE_ZIP_PATH_INVALID", "ZIP 内存在不安全路径。");
            }
            return normalized.toString().replace('\\', '/');
        } catch (InvalidPathException exception) {
            throw badRequest("PACKAGE_ZIP_PATH_INVALID", "ZIP 内存在不安全路径。");
        }
    }

    private Path storageRoot() {
        return Path.of(properties.packageStorage().root()).toAbsolutePath().normalize();
    }

    public Path masterArchivePath(PortalPackageRelease release) {
        Path path = resolveStorageKey(storageRoot(), release.storageKey());
        if (!Files.isRegularFile(path)) {
            throw new ApiException(HttpStatus.CONFLICT, "PACKAGE_MASTER_MISSING", "母版资料包文件不存在。");
        }
        return path;
    }

    private String productId(String baseName) {
        return switch (baseName) {
            case "ASRAY_COMPLETE" -> "DEMO_FULL";
            case "ASRAY_DOCS_COMPLETE", "ASRAY_DESIGN_EXAMPLES",
                    "ASRAY_REQUIREMENTS_COMMUNICATION", "ASRAY_INCIDENT_BUG_REPORT" -> "DEMO_BASIC";
            case "ASRAY_TEST_SPEC_EVIDENCE" -> "DEMO_TEST";
            case "ASRAY_PM_RELEASE_OPERATIONS" -> "DEMO_MANAGEMENT";
            default -> throw badRequest("PACKAGE_PRODUCT_UNSUPPORTED", "该资料包尚未配置商品编号。");
        };
    }

    private Path resolveStorageKey(Path storageRoot, String storageKey) {
        Path path = storageRoot.resolve(storageKey.replace('/', java.io.File.separatorChar)).normalize();
        if (!path.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "PACKAGE_STORAGE_PATH_INVALID", "资料包保存路径无效。");
        }
        return path;
    }

    private void moveImmutable(Path source, Path target) throws IOException {
        if (Files.exists(target)) {
            throw new ApiException(HttpStatus.CONFLICT, "PACKAGE_RELEASE_FILE_EXISTS", "同名资料包文件已经存在，不能覆盖。");
        }
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, target);
        }
    }

    private String baseFileName(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw badRequest("PACKAGE_FILE_NAME_REQUIRED", "上传文件缺少文件名。");
        }
        String portableName = originalFilename.replace('\\', '/');
        return portableName.substring(portableName.lastIndexOf('/') + 1);
    }

    private MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // Cleanup failure must not hide the original upload result.
        }
    }

    private record FilenameParts(String baseName, String version, LocalDate releaseDate) {
    }

    private record ChecksumParts(String sha256) {
    }

    public record UploadResponse(PackageReleaseResponse release, boolean duplicate) {
    }

    public record PackageReleaseResponse(UUID id, String projectCode, String baseName, String productId, String version,
                                         LocalDate releaseDate, String fileName, String sha256, long fileSize,
                                         PackageReleaseStatus status, String uploadedBy, Instant uploadedAt,
                                         Instant archivedAt) {
        static PackageReleaseResponse from(PortalPackageRelease release) {
            return new PackageReleaseResponse(release.id(), release.projectCode(), release.baseName(), release.productId(), release.version(),
                    release.releaseDate(), release.fileName(), release.sha256(), release.fileSize(), release.status(),
                    release.uploadedBy(), release.uploadedAt(), release.archivedAt());
        }
    }
}
