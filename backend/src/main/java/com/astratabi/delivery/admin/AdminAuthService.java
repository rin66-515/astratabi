package com.astratabi.delivery.admin;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.config.PortalProperties;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AdminAuthService {

    private final PortalAdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final PortalProperties properties;
    private final AuditService auditService;

    public AdminAuthService(PortalAdminUserRepository repository, PasswordEncoder passwordEncoder, PortalProperties properties, AuditService auditService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.auditService = auditService;
    }

    @Transactional
    public PortalAdminUser authenticate(String loginId, String password, String clientIp) {
        Instant now = Instant.now();
        PortalAdminUser user = repository.findByLoginId(loginId).orElse(null);
        if (user == null || !user.enabled()) {
            auditService.record("ANONYMOUS", null, "ADMIN_LOGIN_FAILED", "ADMIN_LOGIN", loginId, null, "{\"reason\":\"invalid_credentials\"}");
            throw invalidCredentials();
        }
        if (user.isLocked(now)) {
            auditService.record("ADMIN", user.id().toString(), "ADMIN_LOGIN_LOCKED", "ADMIN_LOGIN", loginId, null, "{\"clientIp\":\"" + jsonValue(clientIp) + "\"}");
            throw invalidCredentials();
        }
        if (!passwordEncoder.matches(password, user.passwordHash())) {
            user.registerLoginFailure(now, properties.security().maxFailedLogins(), properties.security().adminLockMinutes());
            auditService.record("ADMIN", user.id().toString(), "ADMIN_LOGIN_FAILED", "ADMIN_LOGIN", loginId, null, "{\"clientIp\":\"" + jsonValue(clientIp) + "\"}");
            throw invalidCredentials();
        }
        user.registerLoginSuccess(now);
        auditService.record("ADMIN", user.id().toString(), "ADMIN_LOGIN_SUCCEEDED", "ADMIN_LOGIN", loginId, null, "{\"clientIp\":\"" + jsonValue(clientIp) + "\"}");
        return user;
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "ログインIDまたはパスワードが正しくありません。");
    }

    private String jsonValue(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
