package com.astratabi.delivery.audit;

import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void record(String actorType, String actorId, String action, String targetType, String targetId, String beforeJson, String afterJson) {
        repository.save(new AuditLog(actorType, actorId, action, targetType, targetId, beforeJson, afterJson));
    }
}
