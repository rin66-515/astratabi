package com.astratabi.delivery.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PortalAdminUserRepository extends JpaRepository<PortalAdminUser, UUID> {
    Optional<PortalAdminUser> findByLoginId(String loginId);
}
