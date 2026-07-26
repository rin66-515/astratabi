package com.astratabi.delivery.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PortalDownloadTicketRepository extends JpaRepository<PortalDownloadTicket, UUID> {
}
