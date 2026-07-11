package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.enums.UserStatus;
import com.aistudyhub.backend.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
public class AdminActiveUserResponse {
    private Long id;
    private String fullName;
    private String email;
    private UserRole role;
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long totalStorageUsedBytes;
}
