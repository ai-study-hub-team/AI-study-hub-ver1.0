package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.PublicShareLinkResponse;
import com.aistudyhub.backend.dto.response.SharedDocumentSubmissionResponse;
import com.aistudyhub.backend.service.DocumentShareLinkService;
import com.aistudyhub.backend.service.SharedDocumentSubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Public (unauthenticated) endpoints for User B.
 *
 * <pre>
 * GET  /api/public/document-share-links/{token}              Validate a share link
 * POST /api/public/document-share-links/{token}/submissions  Submit a file
 * </pre>
 *
 * These endpoints intentionally expose only minimal information —
 * no owner details, no folder/category lists.
 */
@RestController
@RequestMapping("/api/public/document-share-links")
@RequiredArgsConstructor
public class PublicShareLinkController {

    private final DocumentShareLinkService shareLinkService;
    private final SharedDocumentSubmissionService submissionService;

    // GET /api/public/document-share-links/{token}
    @GetMapping("/{token}")
    public ResponseEntity<PublicShareLinkResponse> validateLink(
            @PathVariable String token) {
        PublicShareLinkResponse response = shareLinkService.validatePublicToken(token);
        return ResponseEntity.ok(response);
    }

    // POST /api/public/document-share-links/{token}/submissions
    @PostMapping(value = "/{token}/submissions",
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SharedDocumentSubmissionResponse> submitFile(
            @PathVariable String token,
            @RequestParam("file")                              MultipartFile file,
            @RequestParam(value = "title",       required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "uploaderName",  required = false) String uploaderName,
            @RequestParam(value = "uploaderEmail", required = false) String uploaderEmail,
            @RequestParam(value = "uploaderUserId", required = false) Long uploaderUserId) {

        try {
            SharedDocumentSubmissionResponse response = submissionService.handlePublicUpload(
                    token, file, title, description,
                    uploaderName, uploaderEmail, uploaderUserId,
                    shareLinkService);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            // Unsupported file type
            return ResponseEntity.badRequest().build();

        } catch (RuntimeException e) {
            // Invalid token / disabled / expired / max uploads
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
