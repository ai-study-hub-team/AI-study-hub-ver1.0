package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class UserActivityLogResponse {
    private Long id;
    private Long userId;
    private String action;
    private String targetType;
    private Long targetId;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;
}

