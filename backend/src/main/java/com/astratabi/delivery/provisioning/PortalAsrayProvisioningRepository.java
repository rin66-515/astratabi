package com.astratabi.delivery.provisioning;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PortalAsrayProvisioningRepository extends JpaRepository<PortalAsrayProvisioning, UUID> {
    Optional<PortalAsrayProvisioning> findByDelivery_Id(UUID deliveryId);
}
