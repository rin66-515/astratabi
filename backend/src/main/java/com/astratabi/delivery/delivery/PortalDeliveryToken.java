package com.astratabi.delivery.delivery;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "portal_delivery_token")
public class PortalDeliveryToken {

    @Id
    @Column(name = "token_id", nullable = false)
    UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false)
    PortalDelivery delivery;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    String tokenHash;
    @Column(name = "issued_at", nullable = false)
    Instant issuedAt;
    @Column(name = "revoked_at")
    Instant revokedAt;
    @Column(name = "last_used_at")
    Instant lastUsedAt;

    protected PortalDeliveryToken() {
    }

    public static PortalDeliveryToken create(PortalDelivery delivery, String tokenHash) {
        PortalDeliveryToken token = new PortalDeliveryToken();
        token.id = UUID.randomUUID();
        token.delivery = delivery;
        token.tokenHash = tokenHash;
        token.issuedAt = Instant.now();
        return token;
    }

    public void revoke(Instant now) { revokedAt = now; }
    public void markUsed(Instant now) { lastUsedAt = now; }
    public boolean active() { return revokedAt == null; }
    public UUID id() { return id; }
    public PortalDelivery delivery() { return delivery; }
}
