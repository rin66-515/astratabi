ALTER TABLE portal_package_release
    DROP CONSTRAINT uq_portal_package_release_version;

ALTER TABLE portal_package_release
    ADD CONSTRAINT uq_portal_package_release_product_version
        UNIQUE (project_code, base_name, version, release_date);
