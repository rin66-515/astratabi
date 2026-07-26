package com.astratabi.delivery.admin;

import com.astratabi.delivery.config.PortalProperties;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAdminRunner implements ApplicationRunner {

    private final PortalAdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final PortalProperties properties;

    public BootstrapAdminRunner(PortalAdminUserRepository repository, PasswordEncoder passwordEncoder, PortalProperties properties) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (properties.security().tokenPepper() == null || properties.security().tokenPepper().isBlank()) {
            throw new IllegalStateException("PORTAL_TOKEN_PEPPER must be set before startup");
        }
        if (repository.count() > 0) {
            return;
        }
        String password = properties.bootstrap().adminPassword();
        if (password == null || password.isBlank()) {
            throw new IllegalStateException("PORTAL_BOOTSTRAP_ADMIN_PASSWORD must be set before the first startup");
        }
        repository.save(PortalAdminUser.create(properties.bootstrap().adminLoginId(), passwordEncoder.encode(password)));
    }
}
