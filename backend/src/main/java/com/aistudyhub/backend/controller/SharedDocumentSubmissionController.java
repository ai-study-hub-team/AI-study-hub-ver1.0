package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.SharedDocumentApproveRequest;
import com.aistudyhub.backend.dto.request.SharedDocumentRejectRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.dto.response.SharedDocumentSubmissionResponse;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.service.CurrentUserService;
import com.aistudyhub.backend.service.SharedDocumentSubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * Authenticated endpoints for User A (the link owner) to review, approve, or reject
 * shared submissions, and preview/download via Cloudinary redirect.
 *
 * <pre>
 * GET  /api/shared-document-submissions[?status=PENDING_REVIEW]
 * GET  /api/shared-document-submissions/{id}
 * GET  /api/shared-document-submissions/{id}/preview   → 302 redirect to cloud URL
 * GET  /api/shared-document-submissions/{id}/download  → 302 redirect to cloud URL
 * POST /api/shared-document-submissions/{id}/approve
 * POST /api/shared-document-submissions/{id}/reject
 * </pre>
 *
 * All operations require JWT. Owner ID is derived from the JWT — no userId parameter
 * is accepted from clients (IDOR prevention).
 */
@RestController
@RequestMapping("/api/shared-document-submissions")
@RequiredArgsConstructor
public class SharedDocumentSubmissionController {

    private final SharedDocumentSubmissionService submissionService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<List<SharedDocumentSubmissionResponse>> getAll(
            @RequestParam(required = false) SharedSubmissionStatus status) {
        User owner = currentUserService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionsForOwner(owner.getId(), status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SharedDocumentSubmissionResponse> getById(@PathVariable Long id) {
        User owner = currentUserService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionForOwner(id, owner.getId()));
    }

    /**
     * Redirects to the Cloudinary secure URL for inline preview.
     * Authorization is enforced: only the link owner may preview.
     */
    @GetMapping("/{id}/preview")
    public ResponseEntity<Void> preview(@PathVariable Long id) {
        User owner = currentUserService.getCurrentUser();
        String cloudUrl = submissionService.getCloudUrlForOwner(id, owner.getId());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, cloudUrl)
                .build();
    }

    /**
     * Redirects to the Cloudinary secure URL for download.
     * Authorization is enforced: only the link owner may download.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Void> download(@PathVariable Long id) {
        User owner = currentUserService.getCurrentUser();
        String cloudUrl = submissionService.getCloudUrlForOwner(id, owner.getId());
        // Append fl_attachment to force download instead of inline display
        String downloadUrl = cloudUrl.contains("?")
                ? cloudUrl + "&fl_attachment"
                : cloudUrl + "?fl_attachment";
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, downloadUrl)
                .build();
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<DocumentResponse> approve(
            @PathVariable Long id,
            @RequestBody SharedDocumentApproveRequest request) {
        User reviewer = currentUserService.getCurrentUser();
        return ResponseEntity.ok(submissionService.approveSubmission(id, request, reviewer));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<SharedDocumentSubmissionResponse> reject(
            @PathVariable Long id,
            @RequestBody SharedDocumentRejectRequest request) {
        User reviewer = currentUserService.getCurrentUser();
        return ResponseEntity.ok(submissionService.rejectSubmission(id, request, reviewer));
    }

    @DeleteMapping("/share-links/{linkId}")
    public ResponseEntity<Void> deleteSubmissionGroup(@PathVariable Long linkId) {
        User owner = currentUserService.getCurrentUser();
        submissionService.softDeleteSubmissionGroup(linkId, owner.getId());
        return ResponseEntity.noContent().build();
    }
}
