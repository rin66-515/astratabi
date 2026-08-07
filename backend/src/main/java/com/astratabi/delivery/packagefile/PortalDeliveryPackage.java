package com.astratabi.delivery.packagefile;

import com.astratabi.delivery.delivery.PortalDelivery;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "portal_delivery_package")
public class PortalDeliveryPackage {

    @Id
    @Column(name = "delivery_package_id", nullable = false)
    UUID id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false, unique = true)
    PortalDelivery delivery;
    @Column(name = "source_storage_key", nullable = false, length = 600)
    String sourceStorageKey;
    @Column(name = "delivered_storage_key", length = 600)
    String deliveredStorageKey;
    @Column(name = "delivered_file_name", length = 240)
    String deliveredFileName;
    @Column(name = "delivered_sha256", length = 64)
    String deliveredSha256;
    @Column(name = "delivered_file_size")
    Long deliveredFileSize;
    @Column(name = "encrypted_workbook_count", nullable = false)
    int encryptedWorkbookCount;
    @Enumerated(EnumType.STRING)
    @Column(name = "generation_status", nullable = false, length = 30)
    DeliveryPackageStatus generationStatus;
    @Column(name = "generation_started_at")
    Instant generationStartedAt;
    @Column(name = "generation_completed_at")
    Instant generationCompletedAt;
    @Column(name = "failure_code", length = 80)
    String failureCode;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected PortalDeliveryPackage() {
    }

    public static PortalDeliveryPackage create(PortalDelivery delivery, String sourceStorageKey, Instant now) {
        PortalDeliveryPackage value = new PortalDeliveryPackage();
        value.id = UUID.randomUUID();
        value.delivery = delivery;
        value.sourceStorageKey = sourceStorageKey;
        value.generationStatus = DeliveryPackageStatus.WAITING_PASSWORD;
        value.createdAt = now;
        value.updatedAt = now;
        return value;
    }

    public void begin(Instant now) {
        generationStatus = DeliveryPackageStatus.PROCESSING;
        generationStartedAt = now;
        generationCompletedAt = null;
        failureCode = null;
        updatedAt = now;
    }

    public void ready(String storageKey, String fileName, String sha256, long size, int encryptedCount, Instant now) {
        deliveredStorageKey = storageKey;
        deliveredFileName = fileName;
        deliveredSha256 = sha256;
        deliveredFileSize = size;
        encryptedWorkbookCount = encryptedCount;
        generationStatus = DeliveryPackageStatus.READY;
        generationCompletedAt = now;
        failureCode = null;
        updatedAt = now;
    }

    public void failed(String code, Instant now) {
        generationStatus = DeliveryPackageStatus.FAILED;
        failureCode = code;
        generationCompletedAt = now;
        updatedAt = now;
    }

    public PortalDelivery delivery() { return delivery; }
    public String sourceStorageKey() { return sourceStorageKey; }
    public String deliveredStorageKey() { return deliveredStorageKey; }
    public String deliveredFileName() { return deliveredFileName; }
    public String deliveredSha256() { return deliveredSha256; }
    public Long deliveredFileSize() { return deliveredFileSize; }
    public int encryptedWorkbookCount() { return encryptedWorkbookCount; }
    public DeliveryPackageStatus generationStatus() { return generationStatus; }
}
