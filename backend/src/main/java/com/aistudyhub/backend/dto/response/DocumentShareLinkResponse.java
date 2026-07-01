package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.entity.DocumentShareStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Full share link response returned to User A (authenticated).
 */
@Getter
@Setter
@Builder
public class DocumentShareLinkResponse {

    private Long id;
    private Long ownerUserId;
    private String title;
    private String description;
    private DocumentShareStatus status;
    private LocalDateTime expiresAt;
    private Integer maxUploads;
    private int currentUploads;

    /** ID of the default folder (if set). */
    private Long defaultFolderId;
    /** Name of the default folder (for display). */
    private String defaultFolderName;

    /** The raw token returned only at creation time; null in subsequent list/get calls. */
    private String token;

    /** Frontend share URL to send to User B. */
    private String shareUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
