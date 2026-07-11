package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EmailVerificationResponse {
    private String message;
    private String email;
    private boolean emailVerified;
    private String nextAction;
}
