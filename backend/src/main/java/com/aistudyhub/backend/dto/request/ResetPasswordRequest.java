package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Reset token cannot be blank")
    @Size(max = 128, message = "Reset token is too long")
    private String token;

    @NotBlank(message = "New password cannot be blank")
    @Size(
            min = 6,
            max = 72,
            message = "Password must be at least 6 characters long."
    )
    private String newPassword;

    @NotBlank(message = "Password confirmation cannot be blank")
    @Size(
            min = 6,
            max = 72,
            message = "Password confirmation must be at least 6 characters long."
    )
    private String confirmPassword;
}