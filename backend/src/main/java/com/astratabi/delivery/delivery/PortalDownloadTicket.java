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
@Table(name = "portal_download_ticket")
public class PortalDownloadTicket {

    @Id
    @Column(name = "ticket_id", nullable = false)
    UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false)
    PortalDelivery delivery;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "token_id", nullable = false)
    PortalDeliveryToken token;
    @Column(name = "ticket_hash", nullable = false, unique = true, length = 64)
    String ticketHash;
    @Column(name = "expires_at", nullable = false)
    Instant expiresAt;
    @Column(name = "used_at")
    Instant usedAt;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    protected PortalDownloadTicket() {
    }

    public static PortalDownloadTicket create(PortalDelivery delivery, PortalDeliveryToken token, String ticketHash, Instant expiresAt) {
        PortalDownloadTicket ticket = new PortalDownloadTicket();
        ticket.id = UUID.randomUUID();
        ticket.delivery = delivery;
        ticket.token = token;
        ticket.ticketHash = ticketHash;
        ticket.expiresAt = expiresAt;
        ticket.createdAt = Instant.now();
        return ticket;
    }

    public boolean availableAt(Instant now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public void markUsed(Instant now) {
        if (!availableAt(now)) {
            throw new IllegalStateException("Download ticket is not available");
        }
        usedAt = now;
    }

    public PortalDelivery delivery() { return delivery; }
    public PortalDeliveryToken token() { return token; }
}
