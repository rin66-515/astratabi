ALTER TABLE portal_delivery_token
    ADD COLUMN token_ciphertext VARCHAR(512);

COMMENT ON COLUMN portal_delivery_token.token_ciphertext IS
    'AES-256-GCM encrypted raw token for authenticated administrator detail display; NULL for legacy tokens';
