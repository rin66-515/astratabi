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
@Table(name = "portal_download_event")
public class PortalDownloadEvent {

    @Id
    @Column(name = "event_id", nullable = false)
    UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false)
    PortalDelivery delivery;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "token_id")
    PortalDeliveryToken token;
    @Column(name = "event_type", nullable = false, length = 40)
    String eventType;
    @Column(name = "client_ip", length = 64)
    String clientIp;
    @Column(name = "user_agent", length = 500)
    String userAgent;
    @Column(name = "occurred_at", nullable = false)
    Instant occurredAt;

    protected PortalDownloadEvent() {
    }

    public static PortalDownloadEvent create(PortalDelivery delivery, PortalDeliveryToken token, String eventType, String clientIp, String userAgent) {
        PortalDownloadEvent event = new PortalDownloadEvent();
        event.id = UUID.randomUUID();
        event.delivery = delivery;
        event.token = token;
        event.eventType = eventType;
        event.clientIp = clientIp;
        event.userAgent = userAgent == null ? null : userAgent.substring(0, Math.min(userAgent.length(), 500));
        event.occurredAt = Instant.now();
        return event;
    }

    public String eventType() { return eventType; }
    public String clientIp() { return clientIp; }
    public Instant occurredAt() { return occurredAt; }
}
