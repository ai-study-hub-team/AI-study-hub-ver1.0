package com.aistudyhub.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.Future;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

@Getter
public class CreatePublicLinkRequest {

    private Boolean allowDownload;

    @Future(message = "Expiration time must be in the future")
    private LocalDateTime expiresAt;

    public void setAllowDownload(Boolean allowDownload) {
        this.allowDownload = allowDownload;
    }

    @JsonSetter("expiresAt")
    public void setExpiresAt(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) {
            this.expiresAt = null;
            return;
        }

        String normalizedExpiresAt = expiresAt.trim();

        try {
            this.expiresAt = OffsetDateTime.parse(normalizedExpiresAt).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            this.expiresAt = LocalDateTime.parse(normalizedExpiresAt);
        }
    }
}
