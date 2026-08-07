package com.astratabi.delivery.provisioning;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductEntitlementPolicyTest {

    @Test
    void resolvesTheApprovedSalesPackageMatrix() {
        assertThat(ProductEntitlementPolicy.resolve("DEMO_BASIC"))
                .containsExactly("SIM_CORE_WORKFLOW");
        assertThat(ProductEntitlementPolicy.resolve("DEMO_TEST"))
                .containsExactly("SIM_CORE_WORKFLOW", "SIM_TEST_EVIDENCE");
        assertThat(ProductEntitlementPolicy.resolve("DEMO_MANAGEMENT"))
                .containsExactly("SIM_CORE_WORKFLOW", "SIM_MANAGEMENT_OPERATIONS");
        assertThat(ProductEntitlementPolicy.resolve("DEMO_FULL"))
                .containsExactly(
                        "SIM_CORE_WORKFLOW",
                        "SIM_MANAGEMENT_OPERATIONS",
                        "SIM_TEST_EVIDENCE");
    }

    @Test
    void rejectsUnknownProducts() {
        assertThatThrownBy(() -> ProductEntitlementPolicy.resolve("DEMO_UNKNOWN"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
