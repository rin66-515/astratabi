CREATE TABLE portal_admin_user (
    admin_id UUID PRIMARY KEY,
    login_id VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portal_customer (
    customer_id UUID PRIMARY KEY,
    customer_code VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    wechat_contact VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portal_delivery (
    delivery_id UUID PRIMARY KEY,
    delivery_no VARCHAR(80) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES portal_customer(customer_id),
    project_code VARCHAR(40) NOT NULL DEFAULT 'ASRAY',
    project_name VARCHAR(200) NOT NULL DEFAULT 'ASRAY 勤怠・承認管理システム',
    package_name VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL,
    expires_at TIMESTAMPTZ,
    download_limit INTEGER NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    watermark_text VARCHAR(500),
    issued_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_portal_delivery_status CHECK (status IN ('DRAFT', 'PREPARING', 'ISSUED', 'EXPIRED', 'REVOKED', 'CANCELLED')),
    CONSTRAINT ck_portal_delivery_download_limit CHECK (download_limit > 0),
    CONSTRAINT ck_portal_delivery_download_count CHECK (download_count >= 0 AND download_count <= download_limit)
);

CREATE TABLE portal_delivery_token (
    token_id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES portal_delivery(delivery_id),
    token_hash CHAR(64) NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

CREATE TABLE portal_download_event (
    event_id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES portal_delivery(delivery_id),
    token_id UUID REFERENCES portal_delivery_token(token_id),
    event_type VARCHAR(40) NOT NULL,
    client_ip VARCHAR(64),
    user_agent VARCHAR(500),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portal_audit_log (
    audit_id UUID PRIMARY KEY,
    actor_type VARCHAR(30) NOT NULL,
    actor_id VARCHAR(100),
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    before_json JSONB,
    after_json JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portal_delivery_status_created_at ON portal_delivery(status, created_at DESC);
CREATE INDEX idx_portal_delivery_customer_id ON portal_delivery(customer_id);
CREATE INDEX idx_portal_download_event_delivery_id ON portal_download_event(delivery_id, occurred_at DESC);
