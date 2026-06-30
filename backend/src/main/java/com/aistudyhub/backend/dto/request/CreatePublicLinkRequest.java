package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreatePublicLinkRequest {
    private Boolean allowDownload;
    private LocalDateTime expiresAt;
}