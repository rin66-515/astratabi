package com.astratabi.delivery.packagefile;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PortalDeliveryPackageRepository extends JpaRepository<PortalDeliveryPackage, UUID> {

    Optional<PortalDeliveryPackage> findByDelivery_Id(UUID deliveryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PortalDeliveryPackage p join fetch p.delivery d join fetch d.customer where p.delivery.id = :deliveryId")
    Optional<PortalDeliveryPackage> findByDeliveryIdForUpdate(@Param("deliveryId") UUID deliveryId);

    @Query("select p from PortalDeliveryPackage p join fetch p.delivery d join fetch d.customer where p.deliveredStorageKey is not null and p.delivery.id = :deliveryId")
    Optional<PortalDeliveryPackage> findReadyDetail(@Param("deliveryId") UUID deliveryId);
}
