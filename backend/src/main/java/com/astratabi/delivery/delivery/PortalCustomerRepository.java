package com.astratabi.delivery.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PortalCustomerRepository extends JpaRepository<PortalCustomer, UUID> {
    Optional<PortalCustomer> findByCustomerCode(String customerCode);
}
