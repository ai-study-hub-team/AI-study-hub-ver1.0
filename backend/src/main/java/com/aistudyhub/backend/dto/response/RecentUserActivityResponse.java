package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class RecentUserActivityResponse {
    private Long userId;
    private String fullName;
    private String email;
    private String role;
    private String accountStatus;
    private LocalDateTime lastLoginAt;
    private LocalDateTime lastActiveAt;
    private String lastAction;
    private long totalDocuments;
    private long totalSharedDocuments;
    private long totalReports;
}
