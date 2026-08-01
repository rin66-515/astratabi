package com.astratabi.delivery.packagefile;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.config.PortalProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
                new PortalProperties.Security("test-pepper", false, 15, 5),
                new PortalProperties.PackageStorage(root.toString(), "ASRAY_COMPLETE", 10_000_000, 100, 50_000_000));
        service = new PackageReleaseService(repository, auditService, properties);
        when(repository.findByFileName(any())).thenReturn(Optional.empty());
        when(repository.findByProjectCodeAndVersionAndReleaseDate(any(), any(), any())).thenReturn(Optional.empty());
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
                "ASRAY", "ASRAY_COMPLETE", "0.0.0", java.time.LocalDate.of(2026, 8, 1), fileName,
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
        return new MockMultipartFile("checksum", fileName + ".sha256", "text/plain", content.getBytes(StandardCharsets.US_ASCII));
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
