package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Request body for rejecting a shared submission (User A).
 */
@Getter
@Setter
public class SharedDocumentRejectRequest {

    /** Reviewer's user ID (User A). */
    private Long userId;

    /** Human-readable reason shown to the submitter (optional but recommended). */
    private String reason;
}
