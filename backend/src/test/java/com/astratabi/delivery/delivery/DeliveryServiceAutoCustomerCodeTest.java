package com.astratabi.delivery.delivery;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.packagefile.PackageReleaseService;
import com.astratabi.delivery.packagefile.PortalDeliveryPackageRepository;
import com.astratabi.delivery.packagefile.PortalPackageRelease;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryServiceAutoCustomerCodeTest {

    private PortalCustomerRepository customerRepository;
    private PortalDeliveryRepository deliveryRepository;
    private PackageReleaseService packageReleaseService;
    private DeliveryService service;
    private PortalPackageRelease release;

    @BeforeEach
    void setUp() {
        customerRepository = mock(PortalCustomerRepository.class);
        deliveryRepository = mock(PortalDeliveryRepository.class);
        packageReleaseService = mock(PackageReleaseService.class);
        PortalDeliveryPackageRepository deliveryPackageRepository =
                mock(PortalDeliveryPackageRepository.class);

        PortalProperties properties = properties();
        service = new DeliveryService(
                customerRepository,
                deliveryRepository,
                mock(PortalDeliveryTokenRepository.class),
                mock(PortalDownloadTicketRepository.class),
                mock(PortalDownloadEventRepository.class),
                mock(AuditService.class),
                properties,
                packageReleaseService,
                deliveryPackageRepository,
                new DeliveryTokenCipher(properties));

        release = PortalPackageRelease.create(
                "ASRAY", "ASRAY_COMPLETE", "DEMO_FULL", "1.0.0",
                LocalDate.of(2026, 8, 16), "ASRAY_COMPLETE_v1.0.0_20260816.zip",
                "master.zip", "master.zip.sha256", "a".repeat(64),
                1000, "admin-001");
        when(packageReleaseService.requireActive(release.id())).thenReturn(release);
        when(customerRepository.save(any(PortalCustomer.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(deliveryRepository.save(any(PortalDelivery.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(deliveryPackageRepository.save(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsIndependentPurchaseScopedCustomersForRepeatedDisplayName() {
        DeliveryService.CreateDeliveryRequest request = new DeliveryService.CreateDeliveryRequest(
                "同一客户", release.id(), Instant.parse("2027-08-16T00:00:00Z"), 3);

        DeliveryService.AdminDeliveryResponse first = service.create(request, "admin-001");
        DeliveryService.AdminDeliveryResponse second = service.create(request, "admin-001");

        assertThat(first.customerCode()).matches("^BUY-[0-9]{8}-[A-HJ-NP-Z2-9]{12}$");
        assertThat(second.customerCode()).matches("^BUY-[0-9]{8}-[A-HJ-NP-Z2-9]{12}$");
        assertThat(first.customerCode()).isNotEqualTo(second.customerCode());
        assertThat(first.deliveryNo()).isEqualTo("DL-" + first.customerCode().substring(4));
        assertThat(second.deliveryNo()).isEqualTo("DL-" + second.customerCode().substring(4));
        assertThat(first.customerName()).isEqualTo("同一客户");
        assertThat(second.customerName()).isEqualTo("同一客户");
        verify(customerRepository, times(2)).save(any(PortalCustomer.class));
    }

    private static PortalProperties properties() {
        String key = Base64.getEncoder().encodeToString(
                "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8));
        return new PortalProperties(
                "http://127.0.0.1:18100",
                new PortalProperties.Bootstrap("admin-001", "unused-password"),
                new PortalProperties.Security("test-pepper", key, false, 15, 5),
                new PortalProperties.PackageStorage(
                        "target/test-auto-customer-code", "ASRAY_COMPLETE", 1048576, 1000, 10485760),
                new PortalProperties.Asray(false, "http://127.0.0.1:18080", "client", "secret", key));
    }
}
