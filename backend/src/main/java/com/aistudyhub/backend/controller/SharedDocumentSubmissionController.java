package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.SharedDocumentApproveRequest;
import com.aistudyhub.backend.dto.request.SharedDocumentRejectRequest;
import com.aistudyhub.backend.dto.response.DocumentResponse;
import com.aistudyhub.backend.dto.response.SharedDocumentSubmissionResponse;
import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import com.aistudyhub.backend.service.SharedDocumentSubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * Authenticated endpoints for User A to review shared submissions.
 *
 * <pre>
 * GET    /api/shared-document-submissions?userId=1[&status=PENDING_REVIEW]
 * GET    /api/shared-document-submissions/{id}?userId=1
 * POST   /api/shared-document-submissions/{id}/approve
 * POST   /api/shared-document-submissions/{id}/reject
 * </pre>
 */
@RestController
@RequestMapping("/api/shared-document-submissions")
@RequiredArgsConstructor
public class SharedDocumentSubmissionController {

    private final SharedDocumentSubmissionService submissionService;

    // GET /api/shared-document-submissions?userId=1&status=PENDING_REVIEW
    @GetMapping
    public ResponseEntity<List<SharedDocumentSubmissionResponse>> getAll(
            @RequestParam Long userId,
            @RequestParam(required = false) SharedSubmissionStatus status) {
        return ResponseEntity.ok(submissionService.getSubmissionsForOwner(userId, status));
    }

    // GET /api/shared-document-submissions/{id}?userId=1
    @GetMapping("/{id}")
    public ResponseEntity<SharedDocumentSubmissionResponse> getById(
            @PathVariable Long id,
            @RequestParam Long userId) {
        return ResponseEntity.ok(submissionService.getSubmissionForOwner(id, userId));
    }

    // POST /api/shared-document-submissions/{id}/approve
    @PostMapping("/{id}/approve")
    public ResponseEntity<DocumentResponse> approve(
            @PathVariable Long id,
            @RequestBody SharedDocumentApproveRequest request) {
        try {
            DocumentResponse response = submissionService.approveSubmission(id, request);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // POST /api/shared-document-submissions/{id}/reject
    @PostMapping("/{id}/reject")
    public ResponseEntity<SharedDocumentSubmissionResponse> reject(
            @PathVariable Long id,
            @RequestBody SharedDocumentRejectRequest request) {
        return ResponseEntity.ok(submissionService.rejectSubmission(id, request));
    }
}
