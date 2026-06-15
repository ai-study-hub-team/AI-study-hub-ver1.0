package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.SummaryGenerateRequest;
import com.aistudyhub.backend.dto.response.SummaryGenerateResponse;
import com.aistudyhub.backend.service.SummaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/summaries")
@RequiredArgsConstructor
public class SummaryController {

    private final SummaryService summaryService;

    @PostMapping("/generate")
    public ResponseEntity<SummaryGenerateResponse> generateSummary(@Valid @RequestBody SummaryGenerateRequest request) {
        SummaryGenerateResponse response = summaryService.generateSummary(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<SummaryGenerateResponse>> getSummariesByUserId(@RequestParam Long userId) {
        List<SummaryGenerateResponse> responses = summaryService.getSummariesByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/document/{documentId}")
    public ResponseEntity<List<SummaryGenerateResponse>> getSummariesByDocumentId(
            @PathVariable Long documentId,
            @RequestParam Long userId) {
        List<SummaryGenerateResponse> responses = summaryService.getSummariesByDocumentId(documentId, userId);
        return ResponseEntity.ok(responses);
    }
}
