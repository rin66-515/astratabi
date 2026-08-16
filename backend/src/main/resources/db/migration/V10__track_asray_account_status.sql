ALTER TABLE portal_asray_provisioning
    ADD COLUMN account_status VARCHAR(30);

UPDATE portal_asray_provisioning
   SET account_status = 'PENDING_ACTIVATION'
 WHERE provisioning_status = 'COMPLETED'
   AND asray_user_id IS NOT NULL;

ALTER TABLE portal_asray_provisioning
    ADD CONSTRAINT ck_asray_account_status CHECK (
        account_status IS NULL OR account_status IN (
            'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'
        )
    );
