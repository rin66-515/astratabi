package com.astratabi.delivery;

import com.astratabi.delivery.config.PortalProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableConfigurationProperties(PortalProperties.class)
public class AstraTabiDeliveryApplication {

    public static void main(String[] args) {
        SpringApplication.run(AstraTabiDeliveryApplication.class, args);
    }
}
