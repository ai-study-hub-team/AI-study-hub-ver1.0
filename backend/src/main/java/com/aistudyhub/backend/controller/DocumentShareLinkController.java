package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.DocumentShareLinkCreateRequest;
import com.aistudyhub.backend.dto.response.DocumentShareLinkResponse;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Authenticated endpoints for User A to manage share links.
 *
 * <pre>
 * POST   /api/document-share-links              Create a new share link
 * GET    /api/document-share-links?userId=1     List all links for a user
 * PATCH  /api/document-share-links/{id}/disable Disable a share link
 * </pre>
 */
@RestController
@RequestMapping("/api/document-share-links")
@RequiredArgsConstructor
public class DocumentShareLinkController {

    private final DocumentShareLinkService shareLinkService;

    // POST /api/document-share-links
    @PostMapping
    public ResponseEntity<DocumentShareLinkResponse> create(
            @RequestBody DocumentShareLinkCreateRequest request) {
        DocumentShareLinkResponse response = shareLinkService.createShareLink(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /api/document-share-links?userId=1
    @GetMapping
    public ResponseEntity<List<DocumentShareLinkResponse>> getAllForUser(
            @RequestParam Long userId) {
        return ResponseEntity.ok(shareLinkService.getLinksForUser(userId));
    }

    // PATCH /api/document-share-links/{id}/disable?userId=1
    @PatchMapping("/{id}/disable")
    public ResponseEntity<DocumentShareLinkResponse> disable(
            @PathVariable Long id,
            @RequestParam Long userId) {
        return ResponseEntity.ok(shareLinkService.disableLink(id, userId));
    }
}
