ALTER TABLE portal_delivery_token
    ALTER COLUMN token_hash TYPE VARCHAR(64);

ALTER TABLE portal_download_ticket
    ALTER COLUMN ticket_hash TYPE VARCHAR(64);
