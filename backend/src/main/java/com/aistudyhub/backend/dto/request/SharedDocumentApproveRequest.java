package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Request body for approving a shared submission (User A).
 * User A decides the final metadata for the official Document.
 */
@Getter
@Setter
public class SharedDocumentApproveRequest {

    /** Official document title; defaults to submission title if not provided. */
    private String title;

    /** Official document description. */
    private String description;

    /** Optional category ID (must belong to User A). */
    private Long categoryId;

    /**
     * Optional target folder ID (must belong to User A).
     * If null, falls back to the share link's defaultFolderId.
     * If both are null, document goes to root.
     */
    private Long folderId;

    /** e.g. "PUBLIC", "PRIVATE" — stored in document tags. */
    private String visibility;

    /** e.g. "LECTURE", "EXERCISE" — stored in document tags. */
    private String documentType;
}
