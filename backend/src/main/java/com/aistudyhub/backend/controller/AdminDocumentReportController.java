package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.AdminUpdateDocumentReportStatusRequest;
import com.aistudyhub.backend.dto.response.DocumentReportResponse;
import com.aistudyhub.backend.entity.DocumentReportReason;
import com.aistudyhub.backend.entity.DocumentReportStatus;
import com.aistudyhub.backend.service.DocumentReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/document-reports")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Document Reports")
public class AdminDocumentReportController {

    private final DocumentReportService documentReportService;

    @GetMapping
    public ResponseEntity<Page<DocumentReportResponse>> getReports(
            @RequestParam(required = false) DocumentReportStatus status,
            @RequestParam(required = false) DocumentReportReason reason,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ResponseEntity.ok(documentReportService.getReports(status, reason, pageable));
    }

    @GetMapping("/{reportId}")
    public ResponseEntity<DocumentReportResponse> getReport(@PathVariable Long reportId) {
        return ResponseEntity.ok(documentReportService.getReport(reportId));
    }

    @PatchMapping("/{reportId}/status")
    public ResponseEntity<DocumentReportResponse> updateStatus(
            @PathVariable Long reportId,
            @Valid @RequestBody AdminUpdateDocumentReportStatusRequest request
    ) {
        return ResponseEntity.ok(documentReportService.updateStatus(reportId, request));
    }
}
