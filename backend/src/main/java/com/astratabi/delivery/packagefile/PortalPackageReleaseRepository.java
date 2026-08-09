package com.astratabi.delivery.packagefile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortalPackageReleaseRepository extends JpaRepository<PortalPackageRelease, UUID> {

    Optional<PortalPackageRelease> findByFileName(String fileName);

    Optional<PortalPackageRelease> findByProjectCodeAndBaseNameAndVersionAndReleaseDate(
            String projectCode, String baseName, String version, LocalDate releaseDate);

    List<PortalPackageRelease> findAllByOrderByReleaseDateDescUploadedAtDesc();

    List<PortalPackageRelease> findByStatusOrderByReleaseDateDescUploadedAtDesc(PackageReleaseStatus status);
}
