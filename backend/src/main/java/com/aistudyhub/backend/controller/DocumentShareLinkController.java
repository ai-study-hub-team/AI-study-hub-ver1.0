package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.DocumentShareLinkCreateRequest;
import com.aistudyhub.backend.dto.request.DocumentShareLinkUpdateRequest;
import com.aistudyhub.backend.dto.request.ShareLinkAllowlistUpdateRequest;
import com.aistudyhub.backend.dto.response.DocumentShareLinkResponse;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Authenticated endpoints for the share-link owner (User A).
 *
 * <pre>
 * POST   /api/document-share-links                         Create a new share link
 * GET    /api/document-share-links                         List own links
 * GET    /api/document-share-links/{id}                    Get one own link
 * PATCH  /api/document-share-links/{id}                    Update owner-controlled link settings
 * PATCH  /api/document-share-links/{id}/disable            Disable a link
 * PATCH  /api/document-share-links/{id}/allowlist          Update allowlist
 * </pre>
 *
 * All operations require a valid JWT. Owner identity is derived from the JWT principal.
 */
@RestController
@RequestMapping("/api/document-share-links")
@RequiredArgsConstructor
public class DocumentShareLinkController {

    private final DocumentShareLinkService shareLinkService;

    @PostMapping
    public ResponseEntity<DocumentShareLinkResponse> create(
            @Valid @RequestBody DocumentShareLinkCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shareLinkService.createShareLink(request));
    }

    @GetMapping
    public ResponseEntity<List<DocumentShareLinkResponse>> getAllForCurrentUser() {
        return ResponseEntity.ok(shareLinkService.getLinksForCurrentUser());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentShareLinkResponse> getDetails(@PathVariable Long id) {
        return ResponseEntity.ok(shareLinkService.getLinkDetailsForCurrentUser(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DocumentShareLinkResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody DocumentShareLinkUpdateRequest request) {
        return ResponseEntity.ok(shareLinkService.updateLinkSettings(id, request));
    }

    @PatchMapping("/{id}/disable")
    public ResponseEntity<DocumentShareLinkResponse> disable(@PathVariable Long id) {
        return ResponseEntity.ok(shareLinkService.disableLink(id));
    }

    @PatchMapping("/{id}/allowlist")
    public ResponseEntity<DocumentShareLinkResponse> updateAllowlist(
            @PathVariable Long id,
            @Valid @RequestBody ShareLinkAllowlistUpdateRequest request) {
        return ResponseEntity.ok(shareLinkService.updateAllowlist(id, request));
    }
}
