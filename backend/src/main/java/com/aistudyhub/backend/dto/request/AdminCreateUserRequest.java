package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminCreateUserRequest {

    @NotBlank(message = "The full name cannot be blank.")
    @Size(max = 150, message = "The name is too long.")
    private String fullName;

    @NotBlank(message = "Email address cannot be blank")
    @Email(message = "Invalid email address")
    @Size(max = 254, message = "The email is too long.")
    private String email;

    @NotBlank(message = "Password cannot be blank")
    @Size(
            min = 6,
            max = 72,
            message = "Password must be at least 6 characters long."
    )
    private String password;
}
