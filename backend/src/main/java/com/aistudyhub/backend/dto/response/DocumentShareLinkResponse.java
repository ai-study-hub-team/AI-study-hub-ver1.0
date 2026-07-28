package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.entity.DocumentShareStatus;
import com.aistudyhub.backend.entity.ShareLinkAccessPolicy;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Full share link response returned to User A (authenticated owner).
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
    private ShareLinkAccessPolicy accessPolicy;
    private LocalDateTime expiresAt;
    private Integer maxUploads;
    private int currentUploads;
    /** Null when maxUploads is unlimited. */
    private Integer remainingUploads;
    private Integer maxUploadsPerUser;
    private Long maxFileSizeBytes;
    private Long maxTotalBytes;
    /** Bytes occupied by submissions still awaiting review. */
    private Long activeStoredBytes;
    /** Null when maxTotalBytes is unlimited. */
    private Long remainingTotalBytes;
    private String allowedFileTypes;
    /** Parsed MIME types allowed by this link; empty means no link-specific type restriction. */
    private List<String> allowedFileTypesList;

    /** IDs of users explicitly on the allowlist (for PRIVATE_ALLOWLIST policy). */
    private List<Long> allowedUserIds;

    /** Registered email addresses explicitly on the allowlist (for owner display). */
    private List<String> allowedUserEmails;

    /** ID of the default folder (if set). */
    private Long defaultFolderId;
    /** Name of the default folder (for display). */
    private String defaultFolderName;

    /** The raw token returned ONLY at creation time; null in subsequent list/get calls. */
    private String token;

    /** Frontend share URL to send to uploaders. */
    private String shareUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
