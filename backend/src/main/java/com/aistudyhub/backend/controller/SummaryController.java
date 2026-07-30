package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.SummaryGenerateRequest;
import com.aistudyhub.backend.dto.response.SummaryGenerateResponse;
import com.aistudyhub.backend.service.SummaryService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/summaries")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class SummaryController {

    private final SummaryService summaryService;

    @PostMapping("/generate")
    public ResponseEntity<SummaryGenerateResponse> generateSummary(@Valid @RequestBody SummaryGenerateRequest request) {
        SummaryGenerateResponse response = summaryService.generateSummary(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<SummaryGenerateResponse>> getSummaries() {
        List<SummaryGenerateResponse> responses = summaryService.getCurrentUserSummaries();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<List<SummaryGenerateResponse>> getSummariesByDocumentId(
            @PathVariable Long documentId) {
        List<SummaryGenerateResponse> responses = summaryService.getSummariesByDocumentId(documentId);
        return ResponseEntity.ok(responses);
    }
}
