package com.astratabi.delivery.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "portal_audit_log")
public class AuditLog {

    @Id
    @Column(name = "audit_id", nullable = false)
    UUID id;
    @Column(name = "actor_type", nullable = false, length = 30)
    String actorType;
    @Column(name = "actor_id", length = 100)
    String actorId;
    @Column(nullable = false, length = 80)
    String action;
    @Column(name = "target_type", nullable = false, length = 50)
    String targetType;
    @Column(name = "target_id", nullable = false, length = 100)
    String targetId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_json", columnDefinition = "jsonb")
    String beforeJson;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_json", columnDefinition = "jsonb")
    String afterJson;
    @Column(name = "occurred_at", nullable = false)
    Instant occurredAt;

    protected AuditLog() {
    }

    AuditLog(String actorType, String actorId, String action, String targetType, String targetId, String beforeJson, String afterJson) {
        this.id = UUID.randomUUID();
        this.actorType = actorType;
        this.actorId = actorId;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.beforeJson = beforeJson;
        this.afterJson = afterJson;
        this.occurredAt = Instant.now();
    }
}
