package com.astratabi.delivery.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PortalDownloadTicketRepository extends JpaRepository<PortalDownloadTicket, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PortalDownloadTicket t join fetch t.delivery d join fetch d.customer join fetch t.token where t.ticketHash = :ticketHash")
    Optional<PortalDownloadTicket> findDetailByTicketHashForUpdate(@Param("ticketHash") String ticketHash);
}
