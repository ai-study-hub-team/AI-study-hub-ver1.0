package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.AdminActiveUserResponse;
import com.aistudyhub.backend.dto.response.AdminRevenueResponse;
import com.aistudyhub.backend.dto.response.AdminStorageReportResponse;
import com.aistudyhub.backend.service.AdminDashboardService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/active-users")
    public ResponseEntity<List<AdminActiveUserResponse>> getActiveUsers() {
        return ResponseEntity.ok(adminDashboardService.getActiveUsers());
    }

    @GetMapping("/revenue")
    public ResponseEntity<AdminRevenueResponse> getRevenue(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(adminDashboardService.getRevenue(period, date, fromDate, toDate));
    }

    @GetMapping("/storage")
    public ResponseEntity<AdminStorageReportResponse> getStorageReport(
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(adminDashboardService.getStorageReport(userId));
    }
}
