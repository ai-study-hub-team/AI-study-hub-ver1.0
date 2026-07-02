package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PublicLinkResponse {
    private String publicUrl;
    private String token;
    private Boolean allowDownload;
    private Boolean isActive;
    private LocalDateTime expiresAt;
}
