package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.Future;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreatePublicLinkRequest {

    private Boolean allowDownload;

    @Future(message = "Expiration time must be in the future")
    private LocalDateTime expiresAt;
}