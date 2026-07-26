package com.astratabi.delivery.delivery;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PortalDeliveryRepository extends JpaRepository<PortalDelivery, UUID> {

    Page<PortalDelivery> findByStatus(DeliveryStatus status, Pageable pageable);

    @Query("""
            select d from PortalDelivery d
            where lower(d.deliveryNo) like lower(concat('%', :keyword, '%'))
               or lower(d.customer.displayName) like lower(concat('%', :keyword, '%'))
               or lower(d.customer.customerCode) like lower(concat('%', :keyword, '%'))
            """)
    Page<PortalDelivery> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
            select d from PortalDelivery d
            where d.status = :status
              and (lower(d.deliveryNo) like lower(concat('%', :keyword, '%'))
                   or lower(d.customer.displayName) like lower(concat('%', :keyword, '%'))
                   or lower(d.customer.customerCode) like lower(concat('%', :keyword, '%')))
            """)
    Page<PortalDelivery> searchByStatusAndKeyword(@Param("status") DeliveryStatus status, @Param("keyword") String keyword, Pageable pageable);

    @Query("select d from PortalDelivery d join fetch d.customer where d.id = :id")
    Optional<PortalDelivery> findDetailById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from PortalDelivery d join fetch d.customer where d.id = :id")
    Optional<PortalDelivery> findDetailByIdForUpdate(@Param("id") UUID id);

    long countByDeliveryNoStartingWith(String prefix);

    long countByStatus(DeliveryStatus status);
}
