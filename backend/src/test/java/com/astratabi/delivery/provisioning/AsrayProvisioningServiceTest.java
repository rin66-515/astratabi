package com.astratabi.delivery.provisioning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.delivery.PortalCustomer;
import com.astratabi.delivery.delivery.PortalDelivery;
import com.astratabi.delivery.packagefile.PortalPackageRelease;
import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

class AsrayProvisioningServiceTest {

    @Test
    void sendsTheProductSpecificEntitlementContract() throws Exception {
        AtomicReference<String> requestBody = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/internal/v1/customer-accounts", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = """
                    {"eventId":"11111111-2222-3333-4444-555555555555",
                     "userId":"asr-7K3M9Q2D","status":"PENDING_ACTIVATION",
                     "activationUrl":"https://asray.example/activate?token=test",
                     "entitlements":["SIM_CORE_WORKFLOW","SIM_TEST_EVIDENCE"]}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            PortalAsrayProvisioningRepository repository = mock(PortalAsrayProvisioningRepository.class);
            when(repository.findByDelivery_Id(any())).thenReturn(Optional.empty());
            when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

            PortalProperties properties = properties(server.getAddress().getPort());
            AsrayProvisioningService service = new AsrayProvisioningService(
                    properties, repository, new ActivationUrlCipher(properties), new ObjectMapper());

            PortalCustomer customer = PortalCustomer.create("CUST-E2E", "契約テスト");
            PortalPackageRelease release = PortalPackageRelease.create(
                    "ASRAY", "ASRAY_TEST_SPEC_EVIDENCE", "DEMO_TEST", "1.0.0",
                    LocalDate.of(2026, 8, 8), "test.zip", "master/test.zip",
                    "master/test.zip.sha256", "a".repeat(64), 100, "reviewer");
            PortalDelivery delivery = PortalDelivery.create(
                    "DL-E2E-001", customer, release, Instant.parse("2027-08-08T00:00:00Z"), 3);

            AsrayProvisioningService.ProvisioningResult result = service.provision(delivery);

            assertThat(result.userId()).isEqualTo("asr-7K3M9Q2D");
            assertThat(requestBody.get())
                    .contains("\"productIds\":[\"DEMO_TEST\"]")
                    .contains("\"entitlements\":[\"SIM_CORE_WORKFLOW\",\"SIM_TEST_EVIDENCE\"]")
                    .doesNotContain("ASRAY_SIMULATION_ACCESS");
        } finally {
            server.stop(0);
        }
    }

    private static PortalProperties properties(int port) {
        String key = Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef"
                .getBytes(StandardCharsets.UTF_8));
        return new PortalProperties(
                "http://127.0.0.1",
                null,
                null,
                null,
                new PortalProperties.Asray(
                        true,
                        "http://127.0.0.1:" + port,
                        "astratabi-test",
                        "test-hmac-secret",
                        key));
    }
}
