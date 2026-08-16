package com.astratabi.delivery.delivery;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.packagefile.PackageReleaseService;
import com.astratabi.delivery.packagefile.PortalDeliveryPackageRepository;
import com.astratabi.delivery.packagefile.PortalPackageRelease;
import com.astratabi.delivery.provisioning.PortalAsrayProvisioning;
import com.astratabi.delivery.provisioning.PortalAsrayProvisioningRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryServiceListOrderTest {

    private PortalDeliveryRepository deliveryRepository;
    private PortalAsrayProvisioningRepository provisioningRepository;
    private DeliveryService service;

    @BeforeEach
    void setUp() {
        deliveryRepository = mock(PortalDeliveryRepository.class);
        provisioningRepository = mock(PortalAsrayProvisioningRepository.class);
        PortalProperties properties = properties();
        service = new DeliveryService(
                mock(PortalCustomerRepository.class),
                deliveryRepository,
                mock(PortalDeliveryTokenRepository.class),
                mock(PortalDownloadTicketRepository.class),
                mock(PortalDownloadEventRepository.class),
                mock(AuditService.class),
                properties,
                mock(PackageReleaseService.class),
                mock(PortalDeliveryPackageRepository.class),
                provisioningRepository,
                new DeliveryTokenCipher(properties));
    }

    @Test
    void listsNewestDeliveriesFirstForEveryFilterCombination() {
        when(deliveryRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());
        when(deliveryRepository.findByStatus(eq(DeliveryStatus.DRAFT), any(Pageable.class)))
                .thenReturn(Page.empty());
        when(deliveryRepository.searchByKeyword(eq("client"), any(Pageable.class)))
                .thenReturn(Page.empty());
        when(deliveryRepository.searchByStatusAndKeyword(
                eq(DeliveryStatus.DRAFT), eq("client"), any(Pageable.class)))
                .thenReturn(Page.empty());

        service.list(null, null, 0, 20);
        service.list(null, DeliveryStatus.DRAFT, 0, 20);
        service.list(" client ", null, 0, 20);
        service.list(" client ", DeliveryStatus.DRAFT, 0, 20);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(deliveryRepository).findAll(pageableCaptor.capture());
        verify(deliveryRepository).findByStatus(eq(DeliveryStatus.DRAFT), pageableCaptor.capture());
        verify(deliveryRepository).searchByKeyword(eq("client"), pageableCaptor.capture());
        verify(deliveryRepository).searchByStatusAndKeyword(
                eq(DeliveryStatus.DRAFT), eq("client"), pageableCaptor.capture());

        Sort.Order createdAtDescending = Sort.Order.desc("createdAt");
        Sort.Order idDescending = Sort.Order.desc("id");
        assertThat(pageableCaptor.getAllValues()).allSatisfy(pageable ->
                assertThat(pageable.getSort().toList())
                        .containsExactly(createdAtDescending, idDescending));
    }

    @Test
    void includesAsrayAccountForEachDeliveryWithoutPerRowLookup() {
        PortalPackageRelease release = PortalPackageRelease.create(
                "ASRAY", "ASRAY_COMPLETE", "DEMO_FULL", "1.0.0",
                LocalDate.of(2026, 8, 16), "ASRAY_COMPLETE_v1.0.0_20260816.zip",
                "master.zip", "master.zip.sha256", "a".repeat(64), 1000, "admin-001");
        PortalDelivery delivery = PortalDelivery.create(
                "DL-20260816-ACCOUNT0001",
                PortalCustomer.create("BUY-20260816-ACCOUNT0001", "Customer"),
                release, Instant.parse("2027-08-16T00:00:00Z"), 3);
        PortalAsrayProvisioning provisioning = PortalAsrayProvisioning.create(
                delivery, UUID.randomUUID(), Instant.parse("2026-08-16T00:00:00Z"));
        provisioning.completed(
                "asr-ABCD2345", "legacy-ciphertext", "ACTIVE",
                Instant.parse("2026-08-16T00:01:00Z"));
        when(deliveryRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(delivery)));
        when(provisioningRepository.findByDelivery_IdIn(List.of(delivery.id())))
                .thenReturn(List.of(provisioning));

        Page<DeliveryService.AdminDeliveryResponse> result =
                service.list(null, null, 0, 20);

        assertThat(result.getContent()).singleElement().satisfies(value -> {
            assertThat(value.asrayUserId()).isEqualTo("asr-ABCD2345");
            assertThat(value.asrayAccountStatus()).isEqualTo("ACTIVE");
        });
        verify(provisioningRepository).findByDelivery_IdIn(List.of(delivery.id()));
    }

    private static PortalProperties properties() {
        String key = Base64.getEncoder().encodeToString(
                "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8));
        return new PortalProperties(
                "http://127.0.0.1:18100",
                new PortalProperties.Bootstrap("admin-001", "unused-password"),
                new PortalProperties.Security("test-pepper", key, false, 15, 5),
                new PortalProperties.PackageStorage(
                        "target/test-delivery-list-order", "ASRAY_COMPLETE", 1048576, 1000, 10485760),
                new PortalProperties.Asray(false, "http://127.0.0.1:18080", "client", "secret", key));
    }
}
