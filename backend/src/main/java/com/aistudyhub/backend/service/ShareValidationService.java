package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.DocumentSharePermission;
import com.aistudyhub.backend.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ShareValidationService {

    public DocumentSharePermission parsePermission(String rawPermission) {
        if (rawPermission == null || rawPermission.isBlank()) {
            return DocumentSharePermission.VIEW;
        }

        try {
            return DocumentSharePermission.valueOf(rawPermission.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("permission must be VIEW or DOWNLOAD");
        }
    }

    public void validateExpiresAt(LocalDateTime expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("expiresAt must be in the future");
        }
    }

    public Set<String> normalizeEmails(List<String> emails) {
        Set<String> normalizedEmails = new LinkedHashSet<>();

        if (emails != null) {
            for (String email : emails) {
                if (email == null || email.isBlank()) {
                    continue;
                }
                normalizedEmails.add(email.trim().toLowerCase(Locale.ROOT));
            }
        }

        if (normalizedEmails.isEmpty()) {
            throw new BadRequestException("emails must not be empty");
        }

        return normalizedEmails;
    }
}
