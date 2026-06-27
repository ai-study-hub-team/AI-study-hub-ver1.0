package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserUpdateRequest {

    @NotBlank(message = "Full name must not be blank")
    private String fullName;

    private String role;

    private String status;
}
