package com.astratabi.delivery.packagefile;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.config.PortalProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PackageReleaseServiceTest {

    private PortalPackageReleaseRepository repository;
    private AuditService auditService;
    private PackageReleaseService service;

    @BeforeEach
    void setUp() {
        repository = mock(PortalPackageReleaseRepository.class);
        auditService = mock(AuditService.class);
        Path root = Path.of("target", "test-package-storage", UUID.randomUUID().toString());
        PortalProperties properties = new PortalProperties(
                "http://127.0.0.1:18100",
                new PortalProperties.Bootstrap("admin-001", ""),
                new PortalProperties.Security("test-pepper",
                        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", false, 15, 5),
                new PortalProperties.PackageStorage(root.toString(),
                        "ASRAY_COMPLETE,ASRAY_DOCS_COMPLETE,ASRAY_DESIGN_EXAMPLES,ASRAY_REQUIREMENTS_COMMUNICATION,"
                                + "ASRAY_INCIDENT_BUG_REPORT,ASRAY_TEST_SPEC_EVIDENCE,ASRAY_PM_RELEASE_OPERATIONS,"
                                + "ASRAY_ROLE_DEVELOPER,ASRAY_ROLE_TEST,ASRAY_ROLE_OPERATIONS,ASRAY_ROLE_PM_PL",
                        10_000_000, 100, 50_000_000),
                new PortalProperties.Asray(false, "http://asray", "client", "secret", ""));
        service = new PackageReleaseService(repository, auditService, properties);
        when(repository.findByFileName(any())).thenReturn(Optional.empty());
        when(repository.findByProjectCodeAndBaseNameAndVersionAndReleaseDate(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void uploadsValidatedImmutableRelease() throws Exception {
        String fileName = "ASRAY_COMPLETE_v0.0.0_20260801.zip";
        byte[] zip = zip("documents/README.txt", "simulation package");

        PackageReleaseService.UploadResponse result = service.upload(
                archive(fileName, zip), checksum(fileName, sha256(zip)), "admin-001");

        assertThat(result.duplicate()).isFalse();
        assertThat(result.release().fileName()).isEqualTo(fileName);
        assertThat(result.release().version()).isEqualTo("0.0.0");
        assertThat(result.release().sha256()).isEqualTo(sha256(zip));
        assertThat(result.release().status()).isEqualTo(PackageReleaseStatus.ACTIVE);
        verify(auditService).record(any(), any(), any(), any(), any(), any(), any());
    }

    @ParameterizedTest
    @CsvSource({
            "ASRAY_ROLE_DEVELOPER,DEMO_TEST",
            "ASRAY_ROLE_TEST,DEMO_TEST",
            "ASRAY_ROLE_OPERATIONS,DEMO_MANAGEMENT",
            "ASRAY_ROLE_PM_PL,DEMO_MANAGEMENT"
    })
    void uploadsRolePackageWithApprovedProductId(String baseName, String expectedProductId) throws Exception {
        String fileName = baseName + "_v1.0.0_20260809.zip";
        byte[] zip = zip("documents/README.txt", baseName);

        PackageReleaseService.UploadResponse result = service.upload(
                archive(fileName, zip), checksum(fileName, sha256(zip)), "admin-001");

        assertThat(result.release().baseName()).isEqualTo(baseName);
        assertThat(result.release().productId()).isEqualTo(expectedProductId);
        verify(repository).findByProjectCodeAndBaseNameAndVersionAndReleaseDate(
                "ASRAY", baseName, "1.0.0", java.time.LocalDate.of(2026, 8, 9));
    }

    @ParameterizedTest
    @CsvSource({
            "综合完整商品,ASRAY_COMPLETE,DEMO_FULL",
            "日本IT项目完整仿真资料包,ASRAY_DOCS_COMPLETE,DEMO_BASIC",
            "基本设计书・详细设计书范例,ASRAY_DESIGN_EXAMPLES,DEMO_BASIC",
            "需求确认与客户沟通范例,ASRAY_REQUIREMENTS_COMMUNICATION,DEMO_BASIC",
            "障害报告・Bug报告范例,ASRAY_INCIDENT_BUG_REPORT,DEMO_BASIC",
            "测试式样书・证迹范例,ASRAY_TEST_SPEC_EVIDENCE,DEMO_TEST",
            "项目管理・上线・运维资料包,ASRAY_PM_RELEASE_OPERATIONS,DEMO_MANAGEMENT",
            "开发岗位专属包,ASRAY_ROLE_DEVELOPER,DEMO_TEST",
            "测试岗位专属包,ASRAY_ROLE_TEST,DEMO_TEST",
            "运维岗位专属包,ASRAY_ROLE_OPERATIONS,DEMO_MANAGEMENT",
            "PM・PL岗位专属包,ASRAY_ROLE_PM_PL,DEMO_MANAGEMENT"
    })
    void uploadsRegisteredChineseSalesNameWithInternalProductId(
            String salesName, String baseName, String expectedProductId) throws Exception {
        String fileName = salesName + "_" + baseName + "_v1.0.0_20260816.zip";
        byte[] zip = zip("documents/README.txt", baseName);

        PackageReleaseService.UploadResponse result = service.upload(
                archive(fileName, zip), checksum(fileName, sha256(zip)), "admin-001");

        assertThat(result.release().fileName()).isEqualTo(fileName);
        assertThat(result.release().baseName()).isEqualTo(baseName);
        assertThat(result.release().productId()).isEqualTo(expectedProductId);
    }

    @Test
    void rejectsUnregisteredChineseSalesName() throws Exception {
        String fileName = "任意商品_ASRAY_COMPLETE_v1.0.0_20260816.zip";
        byte[] zip = zip("documents/README.txt", "unsupported alias");

        assertThatThrownBy(() -> service.upload(
                archive(fileName, zip), checksum(fileName, sha256(zip)), "admin-001"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("PACKAGE_FILE_NAME_INVALID"));
    }

    @Test
    void rejectsChecksumMismatch() throws Exception {
        String fileName = "ASRAY_COMPLETE_v0.0.0_20260801.zip";
        byte[] zip = zip("documents/README.txt", "simulation package");

        assertThatThrownBy(() -> service.upload(archive(fileName, zip), checksum(fileName, "0".repeat(64)), "admin-001"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("PACKAGE_CHECKSUM_MISMATCH"));
    }

    @Test
    void treatsSameNameAndHashAsIdempotentRetry() throws Exception {
        String fileName = "ASRAY_COMPLETE_v0.0.0_20260801.zip";
        byte[] zip = zip("documents/README.txt", "simulation package");
        String sha256 = sha256(zip);
        PortalPackageRelease existing = PortalPackageRelease.create(
                "ASRAY", "ASRAY_COMPLETE", "DEMO_FULL", "0.0.0", java.time.LocalDate.of(2026, 8, 1), fileName,
                "packages/asray/existing.zip", "packages/asray/existing.zip.sha256", sha256, zip.length, "admin-001");
        when(repository.findByFileName(fileName)).thenReturn(Optional.of(existing));

        PackageReleaseService.UploadResponse result = service.upload(
                archive(fileName, zip), checksum(fileName, sha256), "admin-001");

        assertThat(result.duplicate()).isTrue();
        assertThat(result.release().id()).isEqualTo(existing.id());
    }

    @Test
    void rejectsUnsafeZipPath() throws Exception {
        String fileName = "ASRAY_COMPLETE_v0.0.0_20260801.zip";
        byte[] zip = zip("../outside.txt", "unsafe");

        assertThatThrownBy(() -> service.upload(archive(fileName, zip), checksum(fileName, sha256(zip)), "admin-001"))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo("PACKAGE_ZIP_PATH_INVALID"));
    }

    private MockMultipartFile archive(String fileName, byte[] zip) {
        return new MockMultipartFile("archive", fileName, "application/zip", zip);
    }

    private MockMultipartFile checksum(String fileName, String sha256) {
        String content = sha256 + "  " + fileName + System.lineSeparator();
        return new MockMultipartFile("checksum", fileName + ".sha256", "text/plain", content.getBytes(StandardCharsets.UTF_8));
    }

    private byte[] zip(String entryName, String content) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream output = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            output.putNextEntry(new ZipEntry(entryName));
            output.write(content.getBytes(StandardCharsets.UTF_8));
            output.closeEntry();
        }
        return bytes.toByteArray();
    }

    private String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
}
