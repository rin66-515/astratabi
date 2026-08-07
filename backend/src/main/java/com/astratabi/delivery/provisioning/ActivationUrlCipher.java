package com.astratabi.delivery.provisioning;

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
public class ActivationUrlCipher {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final byte[] key;

    public ActivationUrlCipher(PortalProperties properties) {
        String encoded = properties.asray().activationUrlEncryptionKey();
        this.key = encoded == null || encoded.isBlank()
                ? new byte[0]
                : Base64.getDecoder().decode(encoded);
    }

    public String encrypt(String plaintext) {
        requireKey();
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(
                    ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array());
        } catch (Exception exception) {
            throw new IllegalStateException("Activation URL encryption failed", exception);
        }
    }

    public String decrypt(String ciphertext) {
        requireKey();
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[12];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Activation URL decryption failed", exception);
        }
    }

    private void requireKey() {
        if (key.length != 32) {
            throw new IllegalStateException("PORTAL_ASRAY_ACTIVATION_URL_KEY must decode to 32 bytes");
        }
    }
}
