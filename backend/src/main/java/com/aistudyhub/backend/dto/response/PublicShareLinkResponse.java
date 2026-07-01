package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Minimal public response for the share link validation endpoint (GET /api/public/...).
 * Does NOT expose owner/folder/category details.
 */
@Getter
@Setter
@Builder
public class PublicShareLinkResponse {

    /** Display title for the upload page. */
    private String title;

    /** Instructions for User B. */
    private String description;

    /**
     * Whether User B is allowed to upload right now.
     * False if: disabled, expired, or max uploads reached.
     */
    private boolean allowUpload;

    /** Reason why upload is not allowed (if allowUpload = false). */
    private String reason;

    private LocalDateTime expiresAt;
}
