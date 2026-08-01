package com.astratabi.delivery.delivery;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/deliveries")
public class AdminDeliveryController {

    private final DeliveryService service;
    private final PortalDownloadEventRepository eventRepository;

    public AdminDeliveryController(DeliveryService service, PortalDownloadEventRepository eventRepository) {
        this.service = service;
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public Page<DeliveryService.AdminDeliveryResponse> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) DeliveryStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(keyword, status, page, size);
    }

    @GetMapping("/summary")
    public DeliveryService.DeliverySummaryResponse summary() {
        return service.summary();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeliveryService.AdminDeliveryResponse create(@Valid @RequestBody CreateRequest request, Authentication authentication) {
        return service.create(new DeliveryService.CreateDeliveryRequest(request.customerCode(), request.customerName(), request.packageReleaseId(), request.expiresAt(), request.downloadLimit()), authentication.getName());
    }

    @GetMapping("/{id}")
    public DeliveryService.AdminDeliveryResponse detail(@PathVariable UUID id) {
        return service.detail(id);
    }

    @PostMapping("/{id}/issue")
    public DeliveryService.IssueResponse issue(@PathVariable UUID id, Authentication authentication) {
        return service.prepareAndCreateLink(id, authentication.getName());
    }

    @PostMapping("/{id}/reissue")
    public DeliveryService.IssueResponse reissue(@PathVariable UUID id, Authentication authentication) {
        return service.prepareAndCreateLink(id, authentication.getName());
    }

    @PostMapping("/{id}/extend")
    public DeliveryService.AdminDeliveryResponse extend(@PathVariable UUID id, @Valid @RequestBody ExtendRequest request, Authentication authentication) {
        return service.extend(id, request.expiresAt(), authentication.getName());
    }

    @PostMapping("/{id}/revoke")
    public DeliveryService.AdminDeliveryResponse revoke(@PathVariable UUID id, Authentication authentication) {
        return service.revoke(id, authentication.getName());
    }

    @GetMapping("/{id}/events")
    public List<DownloadEventResponse> events(@PathVariable UUID id) {
        service.detail(id);
        return eventRepository.findTop100ByDelivery_IdOrderByOccurredAtDesc(id).stream()
                .map(event -> new DownloadEventResponse(event.occurredAt(), event.eventType(), event.clientIp()))
                .toList();
    }

    public record CreateRequest(
            @NotBlank(message = "客户编号为必填项。") String customerCode,
            @NotBlank(message = "客户名称为必填项。") String customerName,
            @NotNull(message = "请选择资料包版本。") UUID packageReleaseId,
            @NotNull(message = "有效期为必填项。") @Future(message = "有效期必须是未来时间。") Instant expiresAt,
            @Min(value = 1, message = "下载次数至少为 1。") @Max(value = 20, message = "下载次数不能超过 20。") int downloadLimit) {
    }

    public record ExtendRequest(@NotNull @Future Instant expiresAt) {
    }

    public record DownloadEventResponse(Instant occurredAt, String eventType, String clientIp) {
    }
}
