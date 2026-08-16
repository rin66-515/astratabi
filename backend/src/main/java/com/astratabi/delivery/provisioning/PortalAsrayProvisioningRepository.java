package com.astratabi.delivery.provisioning;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortalAsrayProvisioningRepository extends JpaRepository<PortalAsrayProvisioning, UUID> {
    Optional<PortalAsrayProvisioning> findByDelivery_Id(UUID deliveryId);

    @EntityGraph(attributePaths = "delivery")
    List<PortalAsrayProvisioning> findByDelivery_IdIn(Collection<UUID> deliveryIds);
}
