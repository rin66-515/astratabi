package com.astratabi.delivery.provisioning;

import java.util.List;
import java.util.Map;

public final class ProductEntitlementPolicy {

    private static final Map<String, List<String>> MATRIX = Map.of(
            "DEMO_BASIC", List.of("SIM_CORE_WORKFLOW"),
            "DEMO_TEST", List.of("SIM_CORE_WORKFLOW", "SIM_TEST_EVIDENCE"),
            "DEMO_MANAGEMENT", List.of("SIM_CORE_WORKFLOW", "SIM_MANAGEMENT_OPERATIONS"),
            "DEMO_FULL", List.of(
                    "SIM_CORE_WORKFLOW",
                    "SIM_MANAGEMENT_OPERATIONS",
                    "SIM_TEST_EVIDENCE"));

    private ProductEntitlementPolicy() {
    }

    public static List<String> resolve(String productId) {
        List<String> entitlements = MATRIX.get(productId);
        if (entitlements == null) {
            throw new IllegalArgumentException("Unsupported ASRAY product: " + productId);
        }
        return entitlements;
    }
}
