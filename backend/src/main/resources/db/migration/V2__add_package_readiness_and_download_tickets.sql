ALTER TABLE portal_delivery
    ADD COLUMN package_ready BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE portal_download_ticket (
    ticket_id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES portal_delivery(delivery_id),
    token_id UUID NOT NULL REFERENCES portal_delivery_token(token_id),
    ticket_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portal_download_ticket_expires_at ON portal_download_ticket(expires_at);
