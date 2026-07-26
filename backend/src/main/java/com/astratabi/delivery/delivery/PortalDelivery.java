package com.astratabi.delivery.delivery;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "portal_delivery")
public class PortalDelivery {

    @Id
    @Column(name = "delivery_id", nullable = false)
    UUID id;
    @Column(name = "delivery_no", nullable = false, unique = true, length = 80)
    String deliveryNo;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    PortalCustomer customer;
    @Column(name = "project_code", nullable = false, length = 40)
    String projectCode;
    @Column(name = "project_name", nullable = false, length = 200)
    String projectName;
    @Column(name = "package_name", nullable = false, length = 200)
    String packageName;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    DeliveryStatus status;
    @Column(name = "expires_at")
    Instant expiresAt;
    @Column(name = "download_limit", nullable = false)
    int downloadLimit;
    @Column(name = "download_count", nullable = false)
    int downloadCount;
    @Column(name = "watermark_text", length = 500)
    String watermarkText;
    @Column(name = "package_ready", nullable = false)
    boolean packageReady;
    @Column(name = "issued_at")
    Instant issuedAt;
    @Column(name = "revoked_at")
    Instant revokedAt;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;
    @Version
    long version;

    protected PortalDelivery() {
    }

    public static PortalDelivery create(String deliveryNo, PortalCustomer customer, String packageName, Instant expiresAt, int downloadLimit) {
        PortalDelivery delivery = new PortalDelivery();
        delivery.id = UUID.randomUUID();
        delivery.deliveryNo = deliveryNo;
        delivery.customer = customer;
        delivery.projectCode = "ASRAY";
        delivery.projectName = "ASRAY 勤怠・承認管理システム";
        delivery.packageName = packageName;
        delivery.status = DeliveryStatus.DRAFT;
        delivery.expiresAt = expiresAt;
        delivery.downloadLimit = downloadLimit;
        delivery.downloadCount = 0;
        delivery.watermarkText = "ASRAY / " + customer.customerCode() + " / " + deliveryNo;
        delivery.createdAt = Instant.now();
        delivery.updatedAt = delivery.createdAt;
        return delivery;
    }

    public void beginPreparing(Instant now) {
        if (status != DeliveryStatus.DRAFT && status != DeliveryStatus.PREPARING) {
            throw new IllegalStateException("Only draft deliveries can be prepared");
        }
        status = DeliveryStatus.PREPARING;
        updatedAt = now;
    }

    public void markIssued(Instant now) {
        packageReady = true;
        status = DeliveryStatus.ISSUED;
        issuedAt = now;
        updatedAt = now;
    }

    public void revoke(Instant now) {
        if (status == DeliveryStatus.CANCELLED) {
            throw new IllegalStateException("Cancelled delivery cannot be revoked");
        }
        status = DeliveryStatus.REVOKED;
        revokedAt = now;
        updatedAt = now;
    }

    public void extend(Instant expiresAt, Instant now) {
        this.expiresAt = expiresAt;
        if (status == DeliveryStatus.EXPIRED) {
            status = packageReady ? DeliveryStatus.ISSUED : DeliveryStatus.PREPARING;
        }
        updatedAt = now;
    }

    public boolean canCreateTicket(Instant now) {
        return status == DeliveryStatus.ISSUED && packageReady && (expiresAt == null || expiresAt.isAfter(now)) && downloadCount < downloadLimit;
    }

    public void consumeDownload(Instant now) {
        if (!canCreateTicket(now)) {
            throw new IllegalStateException("Delivery is not available for download");
        }
        downloadCount++;
        updatedAt = now;
    }

    public UUID id() { return id; }
    public String deliveryNo() { return deliveryNo; }
    public PortalCustomer customer() { return customer; }
    public String projectName() { return projectName; }
    public String packageName() { return packageName; }
    public DeliveryStatus status() { return status; }
    public Instant expiresAt() { return expiresAt; }
    public int downloadLimit() { return downloadLimit; }
    public int downloadCount() { return downloadCount; }
    public String watermarkText() { return watermarkText; }
    public boolean packageReady() { return packageReady; }
    public int remainingDownloads() { return downloadLimit - downloadCount; }
}
