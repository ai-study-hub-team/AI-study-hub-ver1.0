package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class SharedUserResponse {
    private Long userId;
    private String fullName;
    private String email;
    private String permission;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
