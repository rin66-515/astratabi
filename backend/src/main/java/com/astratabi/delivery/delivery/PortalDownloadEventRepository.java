package com.astratabi.delivery.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;

public interface PortalDownloadEventRepository extends JpaRepository<PortalDownloadEvent, UUID> {
    List<PortalDownloadEvent> findTop100ByDelivery_IdOrderByOccurredAtDesc(UUID deliveryId);
}
