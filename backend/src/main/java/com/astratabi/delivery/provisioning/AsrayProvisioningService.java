package com.astratabi.delivery.provisioning;

import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.delivery.PortalDelivery;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class AsrayProvisioningService {
    private static final String PATH = "/internal/v1/customer-accounts";

    private final PortalProperties properties;
    private final PortalAsrayProvisioningRepository repository;
    private final ActivationUrlCipher cipher;
    private final ObjectMapper objectMapper;

    public AsrayProvisioningService(
            PortalProperties properties,
            PortalAsrayProvisioningRepository repository,
            ActivationUrlCipher cipher,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.repository = repository;
        this.cipher = cipher;
        this.objectMapper = objectMapper;
    }

    public ProvisioningResult provision(PortalDelivery delivery) {
        Instant now = Instant.now();
        PortalAsrayProvisioning state = repository.findByDelivery_Id(delivery.id())
                .orElseGet(() -> repository.save(PortalAsrayProvisioning.create(
                        delivery, deterministicEventId(delivery.id()), now)));
        if (state.status() == ProvisioningStatus.COMPLETED) {
            return new ProvisioningResult(
                    state.asrayUserId(), cipher.decrypt(state.activationUrlCiphertext()), "COMPLETED");
        }
        if (!properties.asray().enabled()) {
            state.disabled(now);
            return new ProvisioningResult(null, null, "DISABLED");
        }

        state.processing(now);
        repository.saveAndFlush(state);
        String body = objectMapper.writeValueAsString(new ProvisionRequest(
                state.externalEventId(),
                delivery.customer().customerCode(),
                delivery.deliveryNo(),
                List.of(delivery.packageRelease().productId()),
                List.of("ASRAY_SIMULATION_ACCESS"),
                delivery.expiresAt(),
                1));
        String timestamp = Instant.now().toString();
        String nonce = UUID.randomUUID().toString();
        String canonical = String.join("\n", "POST", PATH, timestamp, nonce, sha256(body));
        String signature = HexFormat.of().formatHex(hmac(properties.asray().hmacSecret(), canonical));

        try {
            ProvisionResponse response = RestClient.create(properties.asray().baseUrl())
                    .post()
                    .uri(PATH)
                    .header("X-Client-Id", properties.asray().clientId())
                    .header("X-Timestamp", timestamp)
                    .header("X-Nonce", nonce)
                    .header("X-Signature", signature)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(ProvisionResponse.class);
            if (response == null || response.userId() == null || response.activationUrl() == null) {
                throw new IllegalStateException("ASRAY response is incomplete");
            }
            state.completed(response.userId(), cipher.encrypt(response.activationUrl()), Instant.now());
            return new ProvisioningResult(response.userId(), response.activationUrl(), response.status());
        } catch (RuntimeException exception) {
            state.failed("ASRAY_PROVISIONING_FAILED", Instant.now());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ASRAY_PROVISIONING_FAILED",
                    "ASRAY アカウントを発行できませんでした。時間をおいて再試行してください。");
        }
    }

    private static UUID deterministicEventId(UUID deliveryId) {
        return UUID.nameUUIDFromBytes(("ASTRATABI-ASRAY:" + deliveryId)
                .getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static byte[] hmac(String secret, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    record ProvisionRequest(
            UUID eventId,
            String customerCode,
            String deliveryNo,
            List<String> productIds,
            List<String> entitlements,
            Instant expiresAt,
            int maxConcurrentSessions) {
    }

    record ProvisionResponse(UUID eventId, String userId, String status, String activationUrl,
                             List<String> entitlements) {
    }

    public record ProvisioningResult(String userId, String activationUrl, String status) {
    }
}
