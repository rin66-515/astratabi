package com.astratabi.delivery.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "portal_admin_user")
public class PortalAdminUser {

    @Id
    @Column(name = "admin_id", nullable = false)
    UUID id;
    @Column(name = "login_id", nullable = false, unique = true, length = 80)
    String loginId;
    @Column(name = "password_hash", nullable = false, length = 255)
    String passwordHash;
    @Column(nullable = false)
    boolean enabled;
    @Column(name = "failed_login_count", nullable = false)
    int failedLoginCount;
    @Column(name = "locked_until")
    Instant lockedUntil;
    @Column(name = "last_login_at")
    Instant lastLoginAt;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected PortalAdminUser() {
    }

    public static PortalAdminUser create(String loginId, String passwordHash) {
        PortalAdminUser user = new PortalAdminUser();
        user.id = UUID.randomUUID();
        user.loginId = loginId;
        user.passwordHash = passwordHash;
        user.enabled = true;
        user.createdAt = Instant.now();
        user.updatedAt = user.createdAt;
        return user;
    }

    public boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    public void registerLoginFailure(Instant now, int maxFailedLogins, int lockMinutes) {
        failedLoginCount++;
        if (failedLoginCount >= maxFailedLogins) {
            lockedUntil = now.plusSeconds(lockMinutes * 60L);
            failedLoginCount = 0;
        }
        updatedAt = now;
    }

    public void registerLoginSuccess(Instant now) {
        failedLoginCount = 0;
        lockedUntil = null;
        lastLoginAt = now;
        updatedAt = now;
    }

    public UUID id() { return id; }
    public String loginId() { return loginId; }
    public String passwordHash() { return passwordHash; }
    public boolean enabled() { return enabled; }
}
