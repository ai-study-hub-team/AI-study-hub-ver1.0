package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.PublicShareLinkResponse;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Anonymous-accessible endpoint for inspecting a share link before uploading.
 *
 * <pre>
 * GET /api/public/document-share-links/{token}   Validate a share link (anonymous)
 * </pre>
 *
 * <p>The upload endpoint has been moved to:
 * {@code POST /api/share-uploads/{token}/submissions} — requires authentication.
 *
 * <p>This endpoint reveals only minimal information — no owner details, no folder lists.
 */
@RestController
@RequestMapping("/api/public/document-share-links")
@RequiredArgsConstructor
public class PublicShareLinkController {

    private final DocumentShareLinkService shareLinkService;

    /**
     * GET /api/public/document-share-links/{token}
     *
     * <p>Returns a minimal response indicating whether the link is currently open for uploads.
     * Does NOT expose owner details, access policy internals, or allowlists.
     */
    @GetMapping("/{token}")
    public ResponseEntity<PublicShareLinkResponse> validateLink(@PathVariable String token) {
        PublicShareLinkResponse response = shareLinkService.validatePublicToken(token);
        return ResponseEntity.ok(response);
    }
}
