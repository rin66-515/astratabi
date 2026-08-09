package com.astratabi.delivery.delivery;

import com.astratabi.delivery.config.PortalProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class DeliveryTokenCipher {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final byte[] CONTEXT = "ASTRATABI_DELIVERY_TOKEN_V1".getBytes(StandardCharsets.UTF_8);
    private final byte[] key;

    public DeliveryTokenCipher(PortalProperties properties) {
        String encoded = properties.security().deliveryTokenEncryptionKey();
        try {
            this.key = encoded == null || encoded.isBlank()
                    ? new byte[0]
                    : Base64.getDecoder().decode(encoded);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "PORTAL_DELIVERY_TOKEN_ENCRYPTION_KEY must be valid Base64", exception);
        }
        if (key.length != 32) {
            throw new IllegalStateException(
                    "PORTAL_DELIVERY_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
        }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            cipher.updateAAD(CONTEXT);
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(
                    ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array());
        } catch (Exception exception) {
            throw new IllegalStateException("Delivery token encryption failed", exception);
        }
    }

    public String decrypt(String ciphertext) {
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            if (combined.length <= 28) {
                throw new IllegalArgumentException("Encrypted delivery token is too short");
            }
            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[12];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            cipher.updateAAD(CONTEXT);
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Delivery token decryption failed", exception);
        }
    }
}
