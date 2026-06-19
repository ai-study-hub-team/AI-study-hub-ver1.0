package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Email address cannot be blank")
    @Email(message = "Invalid email address")
    private String email;

    @NotBlank(message = "Password cannot be blank")
    private String password;
}
