package com.astratabi.delivery.packagefile;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/package-releases")
public class AdminPackageReleaseController {

    private final PackageReleaseService service;

    public AdminPackageReleaseController(PackageReleaseService service) {
        this.service = service;
    }

    @GetMapping
    public List<PackageReleaseService.PackageReleaseResponse> list(
            @RequestParam(defaultValue = "false") boolean includeArchived) {
        return service.list(includeArchived);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PackageReleaseService.UploadResponse> upload(
            @RequestPart("archive") MultipartFile archive,
            @RequestPart("checksum") MultipartFile checksum,
            Authentication authentication) {
        PackageReleaseService.UploadResponse response = service.upload(archive, checksum, authentication.getName());
        return ResponseEntity.status(response.duplicate() ? HttpStatus.OK : HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/archive")
    public PackageReleaseService.PackageReleaseResponse archive(@PathVariable UUID id, Authentication authentication) {
        return service.archive(id, authentication.getName());
    }
}
