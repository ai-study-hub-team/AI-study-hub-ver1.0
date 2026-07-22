package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.request.TokenPricingUpdateRequest;
import com.aistudyhub.backend.dto.response.TokenCostResponse;
import com.aistudyhub.backend.dto.response.TokenPricingResponse;
import com.aistudyhub.backend.dto.response.TokenUsageReportResponse;
import com.aistudyhub.backend.service.TokenPricingService;
import com.aistudyhub.backend.service.TokenUsageReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/token-usage")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AdminTokenUsageController {

    private final TokenUsageReportService tokenUsageReportService;
    private final TokenPricingService tokenPricingService;

    @GetMapping("/report")
    public ResponseEntity<TokenUsageReportResponse> getTokenUsageReport(
            @RequestParam(required = false) Long userId,
            @RequestParam String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ResponseEntity.ok(tokenUsageReportService.getReport(userId, period, date, fromDate, toDate));
    }

    @GetMapping("/cost")
    public ResponseEntity<TokenCostResponse> getSystemTokenCost(
            @RequestParam(required = false) Long userId,
            @RequestParam String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ResponseEntity.ok(tokenPricingService.getSystemCost(userId, period, date, fromDate, toDate));
    }

    @GetMapping("/pricing")
    public ResponseEntity<TokenPricingResponse> getCurrentPricing() {
        return ResponseEntity.ok(tokenPricingService.getCurrentPricing());
    }

    @PatchMapping("/pricing")
    public ResponseEntity<TokenPricingResponse> updatePricing(@Valid @RequestBody TokenPricingUpdateRequest request) {
        return ResponseEntity.ok(tokenPricingService.updatePricing(request));
    }
}
