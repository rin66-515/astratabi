package com.astratabi.delivery.delivery;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PortalDeliveryTokenRepository extends JpaRepository<PortalDeliveryToken, UUID> {

    @Query("select t from PortalDeliveryToken t join fetch t.delivery d join fetch d.customer where t.tokenHash = :tokenHash")
    Optional<PortalDeliveryToken> findDetailByTokenHash(@Param("tokenHash") String tokenHash);

    Optional<PortalDeliveryToken> findFirstByDelivery_IdAndRevokedAtIsNullOrderByIssuedAtDesc(UUID deliveryId);

    @Modifying
    @Query("update PortalDeliveryToken t set t.revokedAt = :now where t.delivery.id = :deliveryId and t.revokedAt is null")
    int revokeActiveByDeliveryId(@Param("deliveryId") UUID deliveryId, @Param("now") Instant now);
}
