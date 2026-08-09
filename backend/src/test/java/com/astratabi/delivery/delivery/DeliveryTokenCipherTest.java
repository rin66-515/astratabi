package com.astratabi.delivery.delivery;

import com.astratabi.delivery.config.PortalProperties;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeliveryTokenCipherTest {

    @Test
    void encryptsAndDecryptsWithoutStoringPlaintext() {
        DeliveryTokenCipher cipher = new DeliveryTokenCipher(properties(validKey()));
        String rawToken = "delivery-token-that-must-remain-confidential";

        String encrypted = cipher.encrypt(rawToken);

        assertThat(encrypted).doesNotContain(rawToken);
        assertThat(cipher.decrypt(encrypted)).isEqualTo(rawToken);
    }

    @Test
    void rejectsTamperedCiphertext() {
        DeliveryTokenCipher cipher = new DeliveryTokenCipher(properties(validKey()));
        byte[] encrypted = Base64.getDecoder().decode(cipher.encrypt("test-delivery-token"));
        encrypted[encrypted.length - 1] ^= 1;

        assertThatThrownBy(() -> cipher.decrypt(Base64.getEncoder().encodeToString(encrypted)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Delivery token decryption failed");
    }

    @Test
    void rejectsMissingOrInvalidKeyAtStartup() {
        assertThatThrownBy(() -> new DeliveryTokenCipher(properties("")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must decode to 32 bytes");
        assertThatThrownBy(() -> new DeliveryTokenCipher(properties("not-base64")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must be valid Base64");
    }

    private static PortalProperties properties(String key) {
        return new PortalProperties(
                "http://127.0.0.1:18100",
                null,
                new PortalProperties.Security("test-pepper", key, false, 15, 5),
                null,
                null);
    }

    private static String validKey() {
        return Base64.getEncoder().encodeToString(
                "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8));
    }
}
