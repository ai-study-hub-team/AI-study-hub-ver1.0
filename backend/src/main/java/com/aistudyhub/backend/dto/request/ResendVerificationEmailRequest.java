package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResendVerificationEmailRequest {

    @NotBlank(message = "email is required")
    @Email(message = "Invalid email address")
    @Size(max = 254, message = "The email is too long.")
    private String email;
}

