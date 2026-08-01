CREATE TABLE portal_package_release (
    package_release_id UUID PRIMARY KEY,
    project_code VARCHAR(40) NOT NULL DEFAULT 'ASRAY',
    base_name VARCHAR(120) NOT NULL,
    version VARCHAR(32) NOT NULL,
    release_date DATE NOT NULL,
    file_name VARCHAR(240) NOT NULL UNIQUE,
    storage_key VARCHAR(600) NOT NULL UNIQUE,
    checksum_storage_key VARCHAR(600) NOT NULL UNIQUE,
    sha256 CHAR(64) NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ,
    CONSTRAINT uq_portal_package_release_version UNIQUE (project_code, version, release_date),
    CONSTRAINT ck_portal_package_release_size CHECK (file_size > 0),
    CONSTRAINT ck_portal_package_release_status CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

ALTER TABLE portal_delivery
    ADD COLUMN package_release_id UUID REFERENCES portal_package_release(package_release_id);

CREATE INDEX idx_portal_package_release_status_date
    ON portal_package_release(status, release_date DESC, uploaded_at DESC);

CREATE INDEX idx_portal_delivery_package_release_id
    ON portal_delivery(package_release_id);
