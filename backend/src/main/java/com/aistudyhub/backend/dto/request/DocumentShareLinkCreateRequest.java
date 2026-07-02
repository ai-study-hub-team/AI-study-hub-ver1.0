package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Request body for creating a new share link (User A).
 */
@Getter
@Setter
public class DocumentShareLinkCreateRequest {

    /** User A's ID. */
    private Long userId;

    /** Title shown to User B on the upload page. */
    private String title;

    /** Instructions / description shown to User B. */
    private String description;

    /** When the link expires. Null = no expiry. */
    private LocalDateTime expiresAt;

    /** Maximum number of submissions. Null = unlimited. */
    private Integer maxUploads;

    /**
     * Optional folder for approved documents (fallback during approval).
     * Must belong to User A.
     */
    private Long defaultFolderId;
}
