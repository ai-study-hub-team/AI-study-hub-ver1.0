package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class ShareRequest {

    @NotEmpty(message = "emails must not be empty")
    private List<@NotBlank(message = "email must not be blank")
    @Email(message = "email format is invalid") String> emails;

    private String permission;

    private LocalDateTime expiresAt;
}
