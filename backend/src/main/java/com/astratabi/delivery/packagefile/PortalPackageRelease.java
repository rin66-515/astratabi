package com.astratabi.delivery.packagefile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "portal_package_release")
public class PortalPackageRelease {

    @Id
    @Column(name = "package_release_id", nullable = false)
    UUID id;
    @Column(name = "project_code", nullable = false, length = 40)
    String projectCode;
    @Column(name = "base_name", nullable = false, length = 120)
    String baseName;
    @Column(nullable = false, length = 32)
    String version;
    @Column(name = "release_date", nullable = false)
    LocalDate releaseDate;
    @Column(name = "file_name", nullable = false, unique = true, length = 240)
    String fileName;
    @Column(name = "storage_key", nullable = false, unique = true, length = 600)
    String storageKey;
    @Column(name = "checksum_storage_key", nullable = false, unique = true, length = 600)
    String checksumStorageKey;
    @Column(nullable = false, length = 64)
    String sha256;
    @Column(name = "file_size", nullable = false)
    long fileSize;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    PackageReleaseStatus status;
    @Column(name = "uploaded_by", nullable = false, length = 100)
    String uploadedBy;
    @Column(name = "uploaded_at", nullable = false)
    Instant uploadedAt;
    @Column(name = "archived_at")
    Instant archivedAt;

    protected PortalPackageRelease() {
    }

    public static PortalPackageRelease create(String projectCode, String baseName, String version,
                                               LocalDate releaseDate, String fileName, String storageKey,
                                               String checksumStorageKey, String sha256, long fileSize,
                                               String uploadedBy) {
        PortalPackageRelease release = new PortalPackageRelease();
        release.id = UUID.randomUUID();
        release.projectCode = projectCode;
        release.baseName = baseName;
        release.version = version;
        release.releaseDate = releaseDate;
        release.fileName = fileName;
        release.storageKey = storageKey;
        release.checksumStorageKey = checksumStorageKey;
        release.sha256 = sha256;
        release.fileSize = fileSize;
        release.status = PackageReleaseStatus.ACTIVE;
        release.uploadedBy = uploadedBy;
        release.uploadedAt = Instant.now();
        return release;
    }

    public void archive(Instant now) {
        if (status == PackageReleaseStatus.ARCHIVED) {
            return;
        }
        status = PackageReleaseStatus.ARCHIVED;
        archivedAt = now;
    }

    public UUID id() { return id; }
    public String projectCode() { return projectCode; }
    public String baseName() { return baseName; }
    public String version() { return version; }
    public LocalDate releaseDate() { return releaseDate; }
    public String fileName() { return fileName; }
    public String storageKey() { return storageKey; }
    public String checksumStorageKey() { return checksumStorageKey; }
    public String sha256() { return sha256; }
    public long fileSize() { return fileSize; }
    public PackageReleaseStatus status() { return status; }
    public String uploadedBy() { return uploadedBy; }
    public Instant uploadedAt() { return uploadedAt; }
    public Instant archivedAt() { return archivedAt; }
}
