package com.astratabi.delivery.delivery;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PublicDeliveryController {

    private final DeliveryService service;

    public PublicDeliveryController(DeliveryService service) {
        this.service = service;
    }

    @GetMapping("/deliveries/{rawToken}")
    public DeliveryService.PublicDeliveryResponse lookup(@PathVariable String rawToken, HttpServletRequest request) {
        return service.lookup(rawToken, request);
    }

    @PostMapping("/deliveries/{rawToken}/download-tickets")
    public DeliveryService.DownloadTicketResponse createTicket(@PathVariable String rawToken, HttpServletRequest request) {
        return service.createDownloadTicket(rawToken, request);
    }

    @GetMapping("/download-tickets/{rawTicket}")
    public void download(@PathVariable String rawTicket) {
        service.downloadFileNotImplemented(rawTicket);
    }
}
