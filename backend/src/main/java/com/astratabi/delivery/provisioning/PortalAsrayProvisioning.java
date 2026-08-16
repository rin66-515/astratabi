package com.astratabi.delivery.provisioning;

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
@Table(name = "portal_asray_provisioning")
public class PortalAsrayProvisioning {
    @Id
    @Column(name = "provisioning_id", nullable = false)
    UUID id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false, unique = true)
    PortalDelivery delivery;
    @Column(name = "external_event_id", nullable = false, unique = true)
    UUID externalEventId;
    @Enumerated(EnumType.STRING)
    @Column(name = "provisioning_status", nullable = false, length = 30)
    ProvisioningStatus status;
    @Column(name = "asray_user_id", length = 50)
    String asrayUserId;
    @Column(name = "activation_url_ciphertext")
    String activationUrlCiphertext;
    @Column(name = "account_status", length = 30)
    String accountStatus;
    @Column(name = "attempt_count", nullable = false)
    int attemptCount;
    @Column(name = "last_error_code", length = 80)
    String lastErrorCode;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;
    @Column(name = "completed_at")
    Instant completedAt;

    protected PortalAsrayProvisioning() {
    }

    public static PortalAsrayProvisioning create(PortalDelivery delivery, UUID eventId, Instant now) {
        PortalAsrayProvisioning value = new PortalAsrayProvisioning();
        value.id = UUID.randomUUID();
        value.delivery = delivery;
        value.externalEventId = eventId;
        value.status = ProvisioningStatus.PENDING;
        value.createdAt = now;
        value.updatedAt = now;
        return value;
    }

    public void processing(Instant now) {
        status = ProvisioningStatus.PROCESSING;
        attemptCount++;
        lastErrorCode = null;
        updatedAt = now;
    }

    public void completed(String userId, String ciphertext, String accountStatus, Instant now) {
        this.status = ProvisioningStatus.COMPLETED;
        asrayUserId = userId;
        activationUrlCiphertext = ciphertext;
        this.accountStatus = accountStatus;
        completedAt = now;
        updatedAt = now;
    }

    public void failed(String code, Instant now) {
        status = ProvisioningStatus.FAILED;
        lastErrorCode = code;
        updatedAt = now;
    }

    public void disabled(Instant now) {
        status = ProvisioningStatus.DISABLED;
        updatedAt = now;
    }

    public PortalDelivery delivery() { return delivery; }
    public UUID externalEventId() { return externalEventId; }
    public ProvisioningStatus status() { return status; }
    public String asrayUserId() { return asrayUserId; }
    public String activationUrlCiphertext() { return activationUrlCiphertext; }
    public String accountStatus() { return accountStatus; }
}
