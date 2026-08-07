package com.astratabi.delivery.packagefile;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.common.SecretHash;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.delivery.PortalCustomer;
import com.astratabi.delivery.delivery.PortalDelivery;
import com.astratabi.delivery.delivery.PortalDeliveryToken;
import com.astratabi.delivery.delivery.PortalDeliveryTokenRepository;
import com.astratabi.delivery.provisioning.AsrayProvisioningService;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CustomerPackageServiceTest {

    @Test
    void generatesWatermarkedAgileEncryptedWorkbookWithoutPersistingPassword() throws Exception {
        Path root = Files.createTempDirectory(Path.of("target"), "customer-package-");
        Path master = root.resolve("master.zip");
        writeMaster(master);

        PortalProperties properties = properties(root);
        PortalDeliveryTokenRepository tokenRepository = mock(PortalDeliveryTokenRepository.class);
        PortalDeliveryPackageRepository packageRepository = mock(PortalDeliveryPackageRepository.class);
        PackageReleaseService releaseService = mock(PackageReleaseService.class);
        AsrayProvisioningService provisioningService = mock(AsrayProvisioningService.class);
        AuditService auditService = mock(AuditService.class);

        PortalPackageRelease release = PortalPackageRelease.create(
                "ASRAY", "ASRAY_COMPLETE", "DEMO_FULL", "1.0.0",
                LocalDate.of(2026, 8, 7), "ASRAY_COMPLETE_v1.0.0_20260807.zip",
                "master.zip", "master.zip.sha256", "a".repeat(64), Files.size(master), "admin-001");
        PortalCustomer customer = PortalCustomer.create("CUST-001", "Test Customer");
        PortalDelivery delivery = PortalDelivery.create(
                "DL-20260807-CUST-001-0001", customer, release,
                Instant.parse("2027-08-07T00:00:00Z"), 3);
        delivery.beginPreparing(Instant.now());
        PortalDeliveryPackage state = PortalDeliveryPackage.create(delivery, "master.zip", Instant.now());
        String rawToken = "t".repeat(43);
        PortalDeliveryToken token = PortalDeliveryToken.create(
                delivery, SecretHash.sha256(rawToken, "test-pepper"));

        when(tokenRepository.findDetailByTokenHash(any())).thenReturn(Optional.of(token));
        when(packageRepository.findByDeliveryIdForUpdate(delivery.id())).thenReturn(Optional.of(state));
        when(packageRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(releaseService.masterArchivePath(release)).thenReturn(master);
        when(provisioningService.provision(delivery)).thenReturn(
                new AsrayProvisioningService.ProvisioningResult(
                        "ext-customer", "https://asray.test/activate?token=secret", "PENDING_ACTIVATION"));

        CustomerPackageService service = new CustomerPackageService(
                tokenRepository, packageRepository, releaseService,
                provisioningService, auditService, properties);
        CustomerPackageService.GenerationResponse response = service.setPasswordAndGenerate(
                rawToken, new CustomerPackageService.PasswordRequest(
                        "Document-Pass1!", "Document-Pass1!"));

        assertThat(response.state()).isEqualTo("READY");
        assertThat(response.encryptedWorkbookCount()).isEqualTo(1);
        assertThat(response.asrayUserId()).isEqualTo("ext-customer");
        Path delivered = root.resolve(state.deliveredStorageKey().replace('/', java.io.File.separatorChar));
        assertThat(delivered).exists();
        try (ZipFile zip = new ZipFile(delivered.toFile(), StandardCharsets.UTF_8)) {
            assertThat(zip.getEntry("ASRAY_交付案内.txt")).isNotNull();
            assertThat(zip.getEntry("ASRAY_交付案内_顧客別.txt")).isNotNull();
            ZipEntry workbook = zip.getEntry("docs/design.xlsx");
            assertThat(workbook).isNotNull();
            byte[] encrypted;
            try (InputStream input = zip.getInputStream(workbook)) {
                encrypted = input.readAllBytes();
            }
            assertThatThrownBy(() -> WorkbookFactory.create(new java.io.ByteArrayInputStream(encrypted)))
                    .isInstanceOf(EncryptedDocumentException.class);
            try (var opened = WorkbookFactory.create(
                    new java.io.ByteArrayInputStream(encrypted), "Document-Pass1!")) {
                assertThat(opened.getSheetAt(0).getFooter().getCenter())
                        .isEqualTo(delivery.watermarkText());
            }
        }
        verify(auditService).record(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejectsPasswordBeforeAnyRepositoryAccess() {
        CustomerPackageService service = new CustomerPackageService(
                mock(PortalDeliveryTokenRepository.class),
                mock(PortalDeliveryPackageRepository.class),
                mock(PackageReleaseService.class),
                mock(AsrayProvisioningService.class),
                mock(AuditService.class),
                properties(Path.of("target", "unused")));

        assertThatThrownBy(() -> service.setPasswordAndGenerate(
                "t".repeat(43), new CustomerPackageService.PasswordRequest("weak", "weak")))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code())
                                .isEqualTo("DOCUMENT_PASSWORD_POLICY_VIOLATION"));
    }

    private static PortalProperties properties(Path root) {
        return new PortalProperties(
                "http://127.0.0.1:18100",
                new PortalProperties.Bootstrap("admin-001", ""),
                new PortalProperties.Security("test-pepper", false, 15, 5),
                new PortalProperties.PackageStorage(
                        root.toString(), "ASRAY_COMPLETE", 10_000_000, 100, 50_000_000),
                new PortalProperties.Asray(
                        true, "http://asray", "client", "secret",
                        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="));
    }

    private static void writeMaster(Path destination) throws Exception {
        byte[] workbook;
        try (XSSFWorkbook value = new XSSFWorkbook();
             ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            value.createSheet("Design").createRow(0).createCell(0).setCellValue("ASRAY");
            value.write(bytes);
            workbook = bytes.toByteArray();
        }
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(destination), StandardCharsets.UTF_8)) {
            zip.putNextEntry(new ZipEntry("docs/design.xlsx"));
            zip.write(workbook);
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("README.txt"));
            zip.write("master".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("ASRAY_交付案内.txt"));
            zip.write("master guide".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
    }
}
