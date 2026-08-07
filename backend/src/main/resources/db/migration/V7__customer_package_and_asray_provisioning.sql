ALTER TABLE portal_package_release
    ADD COLUMN product_id VARCHAR(80);

UPDATE portal_package_release
   SET product_id = CASE base_name
       WHEN 'ASRAY_COMPLETE' THEN 'DEMO_FULL'
       WHEN 'ASRAY_DOCS_COMPLETE' THEN 'DEMO_BASIC'
       WHEN 'ASRAY_DESIGN_EXAMPLES' THEN 'DEMO_BASIC'
       WHEN 'ASRAY_REQUIREMENTS_COMMUNICATION' THEN 'DEMO_BASIC'
       WHEN 'ASRAY_INCIDENT_BUG_REPORT' THEN 'DEMO_BASIC'
       WHEN 'ASRAY_TEST_SPEC_EVIDENCE' THEN 'DEMO_TEST'
       WHEN 'ASRAY_PM_RELEASE_OPERATIONS' THEN 'DEMO_MANAGEMENT'
       ELSE 'DEMO_FULL'
   END;

ALTER TABLE portal_package_release
    ALTER COLUMN product_id SET NOT NULL;

CREATE TABLE portal_delivery_package (
    delivery_package_id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL UNIQUE REFERENCES portal_delivery(delivery_id),
    source_storage_key VARCHAR(600) NOT NULL,
    delivered_storage_key VARCHAR(600),
    delivered_file_name VARCHAR(240),
    delivered_sha256 VARCHAR(64),
    delivered_file_size BIGINT,
    encrypted_workbook_count INTEGER NOT NULL DEFAULT 0,
    generation_status VARCHAR(30) NOT NULL,
    generation_started_at TIMESTAMPTZ,
    generation_completed_at TIMESTAMPTZ,
    failure_code VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_delivery_package_status CHECK (
        generation_status IN ('WAITING_PASSWORD', 'PROCESSING', 'READY', 'FAILED')
    ),
    CONSTRAINT ck_delivery_package_encrypted_count CHECK (encrypted_workbook_count >= 0),
    CONSTRAINT ck_delivery_package_ready CHECK (
        generation_status <> 'READY'
        OR (delivered_storage_key IS NOT NULL AND delivered_file_name IS NOT NULL
            AND delivered_sha256 ~ '^[0-9a-f]{64}$' AND delivered_file_size > 0)
    )
);

CREATE TABLE portal_asray_provisioning (
    provisioning_id UUID PRIMARY KEY,
    delivery_id UUID NOT NULL UNIQUE REFERENCES portal_delivery(delivery_id),
    external_event_id UUID NOT NULL UNIQUE,
    provisioning_status VARCHAR(30) NOT NULL,
    asray_user_id VARCHAR(50),
    activation_url_ciphertext TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error_code VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_asray_provisioning_status CHECK (
        provisioning_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DISABLED')
    ),
    CONSTRAINT ck_asray_provisioning_attempt_count CHECK (attempt_count >= 0)
);

CREATE INDEX idx_delivery_package_status
    ON portal_delivery_package(generation_status, updated_at);
CREATE INDEX idx_asray_provisioning_status
    ON portal_asray_provisioning(provisioning_status, updated_at);
