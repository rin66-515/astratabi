package com.astratabi.delivery.delivery;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.packagefile.PackageReleaseService;
import com.astratabi.delivery.packagefile.PortalDeliveryPackageRepository;
import com.astratabi.delivery.packagefile.PortalPackageRelease;
import com.astratabi.delivery.provisioning.PortalAsrayProvisioningRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DeliveryServiceLinkDetailTest {

    private PortalDeliveryRepository deliveryRepository;
    private PortalDeliveryTokenRepository tokenRepository;
    private DeliveryTokenCipher cipher;
    private DeliveryService service;
    private PortalDelivery delivery;

    @BeforeEach
    void setUp() {
        PortalProperties properties = properties();
        deliveryRepository = mock(PortalDeliveryRepository.class);
        tokenRepository = mock(PortalDeliveryTokenRepository.class);
        cipher = new DeliveryTokenCipher(properties);
        service = new DeliveryService(
                mock(PortalCustomerRepository.class),
                deliveryRepository,
                tokenRepository,
                mock(PortalDownloadTicketRepository.class),
                mock(PortalDownloadEventRepository.class),
                mock(AuditService.class),
                properties,
                mock(PackageReleaseService.class),
                mock(PortalDeliveryPackageRepository.class),
                mock(PortalAsrayProvisioningRepository.class),
                cipher);

        PortalPackageRelease release = PortalPackageRelease.create(
                "ASRAY", "ASRAY_COMPLETE", "DEMO_FULL", "1.0.0",
                LocalDate.of(2026, 8, 9), "ASRAY_COMPLETE_v1.0.0_20260809.zip",
                "master.zip", "master.zip.sha256", "a".repeat(64), 1000, "admin-001");
        delivery = PortalDelivery.create(
                "DL-20260809-C001-0001", PortalCustomer.create("C001", "Customer"), release,
                Instant.parse("2027-08-09T00:00:00Z"), 3);
        when(deliveryRepository.findDetailById(delivery.id())).thenReturn(Optional.of(delivery));
    }

    @Test
    void returnsCurrentLinkOnlyFromAdministratorDetail() {
        String rawToken = "current-raw-token-value-that-is-long-enough";
        PortalDeliveryToken token = PortalDeliveryToken.create(
                delivery, "b".repeat(64), cipher.encrypt(rawToken));
        when(tokenRepository.findFirstByDelivery_IdAndRevokedAtIsNullOrderByIssuedAtDesc(delivery.id()))
                .thenReturn(Optional.of(token));

        DeliveryService.AdminDeliveryDetailResponse detail = service.detail(delivery.id());

        assertThat(detail.linkState()).isEqualTo("AVAILABLE");
        assertThat(detail.deliveryLink()).isEqualTo(
                "http://127.0.0.1:18100/#delivery?token=" + rawToken);
        assertThat(detail.delivery().deliveryNo()).isEqualTo(delivery.deliveryNo());
    }

    @Test
    void marksLegacyHashOnlyTokenAsUnrecoverableWithoutRevokingIt() {
        PortalDeliveryToken legacy = PortalDeliveryToken.create(delivery, "c".repeat(64), null);
        when(tokenRepository.findFirstByDelivery_IdAndRevokedAtIsNullOrderByIssuedAtDesc(delivery.id()))
                .thenReturn(Optional.of(legacy));

        DeliveryService.AdminDeliveryDetailResponse detail = service.detail(delivery.id());

        assertThat(detail.linkState()).isEqualTo("LEGACY_UNRECOVERABLE");
        assertThat(detail.deliveryLink()).isNull();
        assertThat(legacy.active()).isTrue();
    }

    @Test
    void encryptsNewTokenAndReturnsTheIssuedLinkOnce() {
        when(deliveryRepository.findDetailByIdForUpdate(delivery.id())).thenReturn(Optional.of(delivery));
        ArgumentCaptor<PortalDeliveryToken> captor = ArgumentCaptor.forClass(PortalDeliveryToken.class);
        when(tokenRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        DeliveryService.IssueResponse response = service.prepareAndCreateLink(delivery.id(), "admin-001");

        String rawToken = response.deliveryLink().substring(response.deliveryLink().indexOf("token=") + 6);
        PortalDeliveryToken saved = captor.getValue();
        assertThat(rawToken).hasSize(43);
        assertThat(saved.tokenCiphertext()).doesNotContain(rawToken);
        assertThat(cipher.decrypt(saved.tokenCiphertext())).isEqualTo(rawToken);
        assertThat(saved.tokenHash).hasSize(64);
    }

    @Test
    void returnsNoLinkWhenNoActiveTokenExists() {
        when(tokenRepository.findFirstByDelivery_IdAndRevokedAtIsNullOrderByIssuedAtDesc(delivery.id()))
                .thenReturn(Optional.empty());

        DeliveryService.AdminDeliveryDetailResponse detail = service.detail(delivery.id());

        assertThat(detail.linkState()).isEqualTo("NONE");
        assertThat(detail.deliveryLink()).isNull();
    }

    private static PortalProperties properties() {
        String key = Base64.getEncoder().encodeToString(
                "fedcba9876543210fedcba9876543210".getBytes(StandardCharsets.UTF_8));
        return new PortalProperties(
                "http://127.0.0.1:18100",
                null,
                new PortalProperties.Security("test-pepper", key, false, 15, 5),
                new PortalProperties.PackageStorage("target", "ASRAY_COMPLETE", 1000, 10, 1000),
                null);
    }
}
