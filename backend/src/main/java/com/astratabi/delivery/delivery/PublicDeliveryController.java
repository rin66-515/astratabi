package com.astratabi.delivery.delivery;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.nio.charset.StandardCharsets;
import com.astratabi.delivery.packagefile.CustomerPackageService;

@RestController
@RequestMapping("/api/v1")
public class PublicDeliveryController {

    private final DeliveryService service;
    private final CustomerPackageService customerPackageService;

    public PublicDeliveryController(DeliveryService service, CustomerPackageService customerPackageService) {
        this.service = service;
        this.customerPackageService = customerPackageService;
    }

    @GetMapping("/deliveries/{rawToken}")
    public DeliveryService.PublicDeliveryResponse lookup(@PathVariable String rawToken, HttpServletRequest request) {
        return service.lookup(rawToken, request);
    }

    @PostMapping("/deliveries/{rawToken}/download-tickets")
    public DeliveryService.DownloadTicketResponse createTicket(@PathVariable String rawToken, HttpServletRequest request) {
        return service.createDownloadTicket(rawToken, request);
    }

    @PostMapping("/deliveries/{rawToken}/document-password")
    public CustomerPackageService.GenerationResponse setDocumentPassword(
            @PathVariable String rawToken,
            @org.springframework.web.bind.annotation.RequestBody CustomerPackageService.PasswordRequest request) {
        return customerPackageService.setPasswordAndGenerate(rawToken, request);
    }

    @GetMapping("/download-tickets/{rawTicket}")
    public ResponseEntity<org.springframework.core.io.Resource> download(
            @PathVariable String rawTicket,
            HttpServletRequest request) {
        DeliveryService.DownloadFile file = service.claimDownload(rawTicket, request);
        String disposition = ContentDisposition.attachment()
                .filename(file.fileName(), StandardCharsets.UTF_8).build().toString();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header("X-Content-SHA256", file.sha256())
                .body(file.resource());
    }
}
