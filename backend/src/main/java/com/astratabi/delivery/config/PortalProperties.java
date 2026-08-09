package com.astratabi.delivery.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "portal")
public record PortalProperties(
        String publicBaseUrl,
        Bootstrap bootstrap,
        Security security,
        PackageStorage packageStorage,
        Asray asray) {

    public record Bootstrap(String adminLoginId, String adminPassword) {
    }

    public record Security(String tokenPepper, String deliveryTokenEncryptionKey,
                           boolean cookieSecure, int adminLockMinutes, int maxFailedLogins) {
    }

    public record PackageStorage(String root, String allowedBaseName, long maxUploadBytes,
                                 int maxEntryCount, long maxUncompressedBytes) {
    }

    public record Asray(
            boolean enabled,
            String baseUrl,
            String clientId,
            String hmacSecret,
            String activationUrlEncryptionKey) {
    }
}
