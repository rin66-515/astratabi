package com.astratabi.delivery.delivery;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "portal_customer")
public class PortalCustomer {

    @Id
    @Column(name = "customer_id", nullable = false)
    UUID id;
    @Column(name = "customer_code", nullable = false, unique = true, length = 30)
    String customerCode;
    @Column(name = "display_name", nullable = false, length = 200)
    String displayName;
    @Column(name = "wechat_contact", length = 200)
    String wechatContact;
    @Column(name = "created_at", nullable = false)
    Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;

    protected PortalCustomer() {
    }

    public static PortalCustomer create(String customerCode, String displayName) {
        PortalCustomer customer = new PortalCustomer();
        customer.id = UUID.randomUUID();
        customer.customerCode = customerCode;
        customer.displayName = displayName;
        customer.createdAt = Instant.now();
        customer.updatedAt = customer.createdAt;
        return customer;
    }

    public UUID id() { return id; }
    public String customerCode() { return customerCode; }
    public String displayName() { return displayName; }
}
