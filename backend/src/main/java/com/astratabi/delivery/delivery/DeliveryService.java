package com.astratabi.delivery.delivery;

import com.astratabi.delivery.audit.AuditService;
import com.astratabi.delivery.common.ApiException;
import com.astratabi.delivery.common.SecretHash;
import com.astratabi.delivery.config.PortalProperties;
import com.astratabi.delivery.packagefile.PackageReleaseService;
import com.astratabi.delivery.packagefile.PortalPackageRelease;
import com.astratabi.delivery.packagefile.PortalDeliveryPackage;
import com.astratabi.delivery.packagefile.PortalDeliveryPackageRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import java.nio.file.Files;
import java.nio.file.Path;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;

@Service
public class DeliveryService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PROJECT_NAME = "ASRAY 勤怠・承認管理システム";

    private final PortalCustomerRepository customerRepository;
    private final PortalDeliveryRepository deliveryRepository;
    private final PortalDeliveryTokenRepository tokenRepository;
    private final PortalDownloadTicketRepository ticketRepository;
    private final PortalDownloadEventRepository eventRepository;
    private final AuditService auditService;
    private final PortalProperties properties;
    private final PackageReleaseService packageReleaseService;
    private final PortalDeliveryPackageRepository deliveryPackageRepository;

    public DeliveryService(PortalCustomerRepository customerRepository, PortalDeliveryRepository deliveryRepository,
                           PortalDeliveryTokenRepository tokenRepository, PortalDownloadTicketRepository ticketRepository,
                           PortalDownloadEventRepository eventRepository, AuditService auditService, PortalProperties properties,
                           PackageReleaseService packageReleaseService,
                           PortalDeliveryPackageRepository deliveryPackageRepository) {
        this.customerRepository = customerRepository;
        this.deliveryRepository = deliveryRepository;
        this.tokenRepository = tokenRepository;
        this.ticketRepository = ticketRepository;
        this.eventRepository = eventRepository;
        this.auditService = auditService;
        this.properties = properties;
        this.packageReleaseService = packageReleaseService;
        this.deliveryPackageRepository = deliveryPackageRepository;
    }

    @Transactional
    public AdminDeliveryResponse create(CreateDeliveryRequest request, String actorId) {
        PortalPackageRelease packageRelease = packageReleaseService.requireActive(request.packageReleaseId());
        String customerCode = request.customerCode().trim().toUpperCase();
        PortalCustomer customer = customerRepository.findByCustomerCode(customerCode)
                .orElseGet(() -> customerRepository.save(PortalCustomer.create(customerCode, request.customerName().trim())));
        String prefix = "DL-" + LocalDate.now(ZoneOffset.UTC).toString().replace("-", "") + "-" + customerCode + "-";
        String deliveryNo = prefix + String.format("%04d", deliveryRepository.countByDeliveryNoStartingWith(prefix) + 1);
        PortalDelivery delivery = deliveryRepository.save(PortalDelivery.create(deliveryNo, customer, packageRelease, request.expiresAt(), request.downloadLimit()));
        deliveryPackageRepository.save(PortalDeliveryPackage.create(
                delivery, packageRelease.storageKey(), Instant.now()));
        auditService.record("ADMIN", actorId, "DELIVERY_CREATED", "DELIVERY", delivery.id().toString(), null,
                "{\"deliveryNo\":\"" + delivery.deliveryNo() + "\",\"status\":\"DRAFT\"}");
        return AdminDeliveryResponse.from(delivery);
    }

    @Transactional(readOnly = true)
    public Page<AdminDeliveryResponse> list(String keyword, DeliveryStatus status, int page, int size) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<PortalDelivery> result;
        if (normalizedKeyword == null && status == null) {
            result = deliveryRepository.findAll(pageable);
        } else if (normalizedKeyword == null) {
            result = deliveryRepository.findByStatus(status, pageable);
        } else if (status == null) {
            result = deliveryRepository.searchByKeyword(normalizedKeyword, pageable);
        } else {
            result = deliveryRepository.searchByStatusAndKeyword(status, normalizedKeyword, pageable);
        }
        return result.map(AdminDeliveryResponse::from);
    }

    @Transactional(readOnly = true)
    public DeliverySummaryResponse summary() {
        return new DeliverySummaryResponse(
                deliveryRepository.count(),
                deliveryRepository.countByStatus(DeliveryStatus.ISSUED),
                deliveryRepository.countByStatus(DeliveryStatus.PREPARING),
                deliveryRepository.countByStatus(DeliveryStatus.REVOKED));
    }

    @Transactional(readOnly = true)
    public AdminDeliveryResponse detail(UUID id) {
        return AdminDeliveryResponse.from(requireDetail(id));
    }

    @Transactional
    public IssueResponse prepareAndCreateLink(UUID id, String actorId) {
        PortalDelivery delivery = requireLockedDetail(id);
        if (delivery.status() == DeliveryStatus.CANCELLED || delivery.status() == DeliveryStatus.REVOKED) {
            throw new ApiException(HttpStatus.CONFLICT, "DELIVERY_NOT_ISSUABLE", "停止または取消済みの交付は発行できません。");
        }
        Instant now = Instant.now();
        tokenRepository.revokeActiveByDeliveryId(delivery.id(), now);
        delivery.beginPreparing(now);
        String rawToken = generateOpaqueToken();
        tokenRepository.save(PortalDeliveryToken.create(delivery, tokenHash(rawToken)));
        auditService.record("ADMIN", actorId, "DELIVERY_LINK_PREPARED", "DELIVERY", delivery.id().toString(), null,
                "{\"deliveryNo\":\"" + delivery.deliveryNo() + "\",\"status\":\"PREPARING\"}");
        return new IssueResponse(AdminDeliveryResponse.from(delivery), buildPublicLink(rawToken), "PREPARING");
    }

    @Transactional
    public AdminDeliveryResponse extend(UUID id, Instant expiresAt, String actorId) {
        PortalDelivery delivery = requireLockedDetail(id);
        delivery.extend(expiresAt, Instant.now());
        auditService.record("ADMIN", actorId, "DELIVERY_EXTENDED", "DELIVERY", delivery.id().toString(), null,
                "{\"expiresAt\":\"" + expiresAt + "\"}");
        return AdminDeliveryResponse.from(delivery);
    }

    @Transactional
    public AdminDeliveryResponse revoke(UUID id, String actorId) {
        PortalDelivery delivery = requireLockedDetail(id);
        Instant now = Instant.now();
        tokenRepository.revokeActiveByDeliveryId(delivery.id(), now);
        delivery.revoke(now);
        auditService.record("ADMIN", actorId, "DELIVERY_REVOKED", "DELIVERY", delivery.id().toString(), null,
                "{\"status\":\"REVOKED\"}");
        return AdminDeliveryResponse.from(delivery);
    }

    @Transactional
    public PublicDeliveryResponse lookup(String rawToken, HttpServletRequest request) {
        PortalDeliveryToken token = findToken(rawToken);
        PortalDelivery delivery = token.delivery();
        if (!token.active() || delivery.status() == DeliveryStatus.REVOKED || delivery.status() == DeliveryStatus.CANCELLED) {
            throw notFound();
        }
        token.markUsed(Instant.now());
        eventRepository.save(PortalDownloadEvent.create(delivery, token, "DELIVERY_VIEWED", clientIp(request), request.getHeader("User-Agent")));
        if (delivery.expiresAt() != null && !delivery.expiresAt().isAfter(Instant.now())) {
            return PublicDeliveryResponse.expired(delivery);
        }
        if (delivery.status() == DeliveryStatus.PREPARING || !delivery.packageReady()) {
            var packageState = deliveryPackageRepository.findByDelivery_Id(delivery.id())
                    .map(value -> value.generationStatus().name()).orElse("WAITING_PASSWORD");
            return PublicDeliveryResponse.preparing(delivery, packageState);
        }
        if (delivery.status() != DeliveryStatus.ISSUED) {
            throw notFound();
        }
        return PublicDeliveryResponse.active(delivery);
    }

    @Transactional
    public DownloadTicketResponse createDownloadTicket(String rawToken, HttpServletRequest request) {
        PortalDeliveryToken token = findToken(rawToken);
        if (!token.active()) {
            throw notFound();
        }
        PortalDelivery delivery = requireLockedDetail(token.delivery().id());
        Instant now = Instant.now();
        if (delivery.status() == DeliveryStatus.PREPARING || !delivery.packageReady()) {
            throw new ApiException(HttpStatus.CONFLICT, "DELIVERY_NOT_READY", "交付資料は準備中です。お客様サポートへお問い合わせください。");
        }
        if (!delivery.canCreateTicket(now)) {
            throw new ApiException(HttpStatus.CONFLICT, "DELIVERY_UNAVAILABLE", "この交付リンクは現在利用できません。");
        }
        token.markUsed(now);
        String rawTicket = generateOpaqueToken();
        ticketRepository.save(PortalDownloadTicket.create(delivery, token, tokenHash(rawTicket), now.plusSeconds(120)));
        eventRepository.save(PortalDownloadEvent.create(delivery, token, "DOWNLOAD_TICKET_ISSUED", clientIp(request), request.getHeader("User-Agent")));
        return new DownloadTicketResponse("/api/v1/download-tickets/" + rawTicket, delivery.remainingDownloads());
    }

    @Transactional
    public DownloadFile claimDownload(String rawTicket, HttpServletRequest request) {
        if (rawTicket == null || rawTicket.length() < 32) {
            throw new ApiException(HttpStatus.NOT_FOUND, "DOWNLOAD_TICKET_NOT_FOUND", "ダウンロード情報を確認できませんでした。");
        }
        PortalDownloadTicket ticket = ticketRepository
                .findDetailByTicketHashForUpdate(tokenHash(rawTicket))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "DOWNLOAD_TICKET_NOT_FOUND", "ダウンロード情報を確認できませんでした。"));
        Instant now = Instant.now();
        PortalDelivery delivery = ticket.delivery();
        if (!ticket.availableAt(now) || !delivery.canCreateTicket(now)) {
            throw new ApiException(HttpStatus.GONE, "DOWNLOAD_TICKET_UNAVAILABLE", "ダウンロードURLは無効または期限切れです。");
        }
        var customerPackage = deliveryPackageRepository.findReadyDetail(delivery.id())
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,
                        "DELIVERY_NOT_READY", "交付資料は準備中です。"));
        Path root = Path.of(properties.packageStorage().root()).toAbsolutePath().normalize();
        Path file = root.resolve(customerPackage.deliveredStorageKey()
                .replace('/', java.io.File.separatorChar)).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "DELIVERY_FILE_MISSING", "交付ファイルを確認できませんでした。お客様サポートへお問い合わせください。");
        }
        ticket.markUsed(now);
        delivery.consumeDownload(now);
        eventRepository.save(PortalDownloadEvent.create(
                delivery, ticket.token(), "DOWNLOAD_STARTED", clientIp(request), request.getHeader("User-Agent")));
        return new DownloadFile(new FileSystemResource(file), customerPackage.deliveredFileName(),
                customerPackage.deliveredSha256(), customerPackage.deliveredFileSize());
    }

    private PortalDeliveryToken findToken(String rawToken) {
        if (rawToken == null || rawToken.length() < 32) {
            throw notFound();
        }
        return tokenRepository.findDetailByTokenHash(tokenHash(rawToken)).orElseThrow(this::notFound);
    }

    private PortalDelivery requireDetail(UUID id) {
        return deliveryRepository.findDetailById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_NOT_FOUND", "交付記録が見つかりません。"));
    }

    private PortalDelivery requireLockedDetail(UUID id) {
        return deliveryRepository.findDetailByIdForUpdate(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_NOT_FOUND", "交付記録が見つかりません。"));
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "DELIVERY_NOT_FOUND", "有効な受取情報を確認できませんでした。");
    }

    private String tokenHash(String rawValue) {
        return SecretHash.sha256(rawValue, properties.security().tokenPepper() == null ? "" : properties.security().tokenPepper());
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String buildPublicLink(String rawToken) {
        return properties.publicBaseUrl().replaceAll("/$", "") + "/#delivery?token=" + rawToken;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",", 2)[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record CreateDeliveryRequest(String customerCode, String customerName, UUID packageReleaseId, Instant expiresAt, int downloadLimit) {
    }

    public record AdminDeliveryResponse(UUID id, String deliveryNo, String customerCode, String customerName, String projectName,
                                        String packageName, UUID packageReleaseId, String packageVersion,
                                        DeliveryStatus status, Instant expiresAt, int downloadLimit,
                                        int downloadCount, int remainingDownloads, String watermarkText, boolean packageReady) {
        static AdminDeliveryResponse from(PortalDelivery delivery) {
            return new AdminDeliveryResponse(delivery.id(), delivery.deliveryNo(), delivery.customer().customerCode(), delivery.customer().displayName(),
                    delivery.projectName(), delivery.packageName(),
                    delivery.packageRelease() == null ? null : delivery.packageRelease().id(),
                    delivery.packageRelease() == null ? null : delivery.packageRelease().version(),
                    delivery.status(), delivery.expiresAt(), delivery.downloadLimit(),
                    delivery.downloadCount(), delivery.remainingDownloads(), delivery.watermarkText(), delivery.packageReady());
        }
    }

    public record IssueResponse(AdminDeliveryResponse delivery, String deliveryLink, String notice) {
    }

    public record DeliverySummaryResponse(long total, long issued, long preparing, long revoked) {
    }

    public record PublicDeliveryResponse(String state, String projectName, String recipientLabel, String deliveryNumber,
                                         Instant expiresAt, int remainingDownloads, String packageName, String message,
                                         String generationState) {
        static PublicDeliveryResponse active(PortalDelivery delivery) {
            return response("ACTIVE", delivery, "交付資料を受け取れます。", "READY");
        }
        static PublicDeliveryResponse preparing(PortalDelivery delivery, String generationState) {
            return response("PASSWORD_REQUIRED", delivery,
                    "资料密码设置完成后，系统会生成客户专属加密资料包。", generationState);
        }
        static PublicDeliveryResponse expired(PortalDelivery delivery) {
            return response("EXPIRED", delivery, "この交付リンクの有効期限は終了しました。", null);
        }
        private static PublicDeliveryResponse response(String state, PortalDelivery delivery, String message, String generationState) {
            return new PublicDeliveryResponse(state, PROJECT_NAME, delivery.customer().customerCode() + " / " + delivery.customer().displayName(),
                    delivery.deliveryNo(), delivery.expiresAt(), delivery.remainingDownloads(), delivery.packageName(), message, generationState);
        }
    }

    public record DownloadTicketResponse(String downloadUrl, int remainingDownloads) {
    }

    public record DownloadFile(Resource resource, String fileName, String sha256, long size) {
    }
}
