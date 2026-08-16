package com.astratabi.delivery.delivery;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.packagefile.PackageReleaseService;
import com.astratabi.delivery.packagefile.PortalDeliveryPackageRepository;
import com.astratabi.delivery.provisioning.PortalAsrayProvisioningRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeliveryServiceListOrderTest {

    private PortalDeliveryRepository deliveryRepository;
    private DeliveryService service;

    @BeforeEach
    void setUp() {
        deliveryRepository = mock(PortalDeliveryRepository.class);
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
                mock(PortalAsrayProvisioningRepository.class),
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
