package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class SharedItemResponse {
    private Long shareId;
    private Long resourceId;
    private String resourceType;
    private String title;
    private String name;
    private Long ownerId;
    private String ownerName;
    private String ownerEmail;
    private String permission;
    private LocalDateTime sharedAt;
    private LocalDateTime expiresAt;
    private String status;
}
