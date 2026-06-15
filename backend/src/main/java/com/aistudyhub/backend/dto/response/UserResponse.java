package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class UserResponse {

    private Long id;
    private String fullName;
    private String email;
    private String role;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int documentCount;
    private int categoryCount;
}
