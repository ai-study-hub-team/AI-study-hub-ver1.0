package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {

    @NotBlank(message = "fullName must not be blank")
    @Size(max = 150, message = "fullName must not exceed 150 characters")
    private String fullName;

    @Size(max = 30, message = "phone must not exceed 30 characters")
    private String phone;

    @Size(max = 1000, message = "bio must not exceed 1000 characters")
    private String bio;
}
