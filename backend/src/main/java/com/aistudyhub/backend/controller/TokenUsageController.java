package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.CurrentUserTodayTokenUsageResponse;
import com.aistudyhub.backend.service.TokenUsageService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/token-usage")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class TokenUsageController {

    private final TokenUsageService tokenUsageService;

    @GetMapping("/today")
    public ResponseEntity<CurrentUserTodayTokenUsageResponse> getTodayUsage(
            Authentication authentication
    ) {
        Long userId = (Long) authentication.getDetails();
        return ResponseEntity.ok(tokenUsageService.getTodayUsage(userId));
    }
}
