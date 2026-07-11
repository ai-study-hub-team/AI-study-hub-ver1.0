package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String targetType;
    private Long targetId;
    private String actionUrl;
    private boolean read;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}