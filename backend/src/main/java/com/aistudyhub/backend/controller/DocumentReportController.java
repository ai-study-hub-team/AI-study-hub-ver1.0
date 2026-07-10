package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.ReportDocumentRequest;
import com.aistudyhub.backend.dto.response.DocumentReportResponse;
import com.aistudyhub.backend.service.DocumentReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/documents/{documentId}/reports")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Document Reports")
public class DocumentReportController {

    private final DocumentReportService documentReportService;

    @PostMapping
    public ResponseEntity<DocumentReportResponse> reportDocument(
            @PathVariable Long documentId,
            @Valid @RequestBody ReportDocumentRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(documentReportService.reportDocument(documentId, request));
    }
}
