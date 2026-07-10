package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.UserActivityLogResponse;
import com.aistudyhub.backend.service.UserActivityLogService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.aistudyhub.backend.dto.response.RecentUserActivityResponse;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.service.AdminRecentUserActivityService;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;


@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin User Activities")
public class AdminUserActivityController {

    private final UserActivityLogService userActivityLogService;
    private final AdminRecentUserActivityService adminRecentUserActivityService;

    @GetMapping("/{userId}/activities")
    public ResponseEntity<Page<UserActivityLogResponse>> getUserActivities(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ResponseEntity.ok(userActivityLogService.getUserActivities(userId, pageable));
    }

    @GetMapping("/recent-activities")
    public ResponseEntity<Page<RecentUserActivityResponse>> getRecentActivities(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime fromDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "lastActiveAt") String sort
    ) {
        String sortField = "lastLoginAt".equals(sort) ? "lastLoginAt" : "lastActiveAt";
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, sortField)
        );
        return ResponseEntity.ok(
                adminRecentUserActivityService.getRecentActivities(
                        keyword,
                        role,
                        status,
                        fromDate,
                        toDate,
                        pageable
                )
        );
    }

}
