package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.entity.ShareLinkAccessPolicy;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Request body for creating a new share link.
 *
 * <p>The owner identity is derived from the authenticated JWT principal in the
 * service layer.
 *
 * <h3>Supported policies</h3>
 * <ul>
 *   <li>{@code PRIVATE_ALLOWLIST} (default) – specify {@code allowedUserEmails} to grant access.
 *   <li>{@code ANY_AUTHENTICATED_USER} – no allowlist needed.
 *   <li>{@code GROUP} / {@code ORGANIZATION} – will be rejected with 422.
 * </ul>
 */
@Getter
@Setter
public class DocumentShareLinkCreateRequest {

    /** Title shown to uploaders on the upload page. */
    private String title;

    /** Instructions / description shown to uploaders. */
    private String description;

    /** When the link expires. Null = no expiry. */
    private LocalDateTime expiresAt;

    /** Maximum number of submissions accepted. Null = unlimited. */
    private Integer maxUploads;

    /** Maximum submissions per authenticated uploader. Null = unlimited. */
    private Integer maxUploadsPerUser;

    /**
     * Maximum file size in bytes per upload.
     * Null = use the owner's plan-level per-file limit.
     */
    private Long maxFileSizeBytes;

    /**
     * Maximum total staged bytes through this link.
     * Null = unlimited (subject to owner quota).
     */
    private Long maxTotalBytes;

    /**
     * Comma-separated list of allowed MIME types (e.g. "application/pdf,image/png").
     * Null or blank = accept all types permitted by the owner's plan.
     */
    private String allowedFileTypes;

    /**
     * Access policy controlling who may upload.
     * Defaults to {@code PRIVATE_ALLOWLIST} if not specified.
     * GROUP and ORGANIZATION are rejected with 422.
     */
    private ShareLinkAccessPolicy accessPolicy;

    /**
     * Registered user email addresses to pre-populate the allowlist.
     * Only relevant when {@code accessPolicy = PRIVATE_ALLOWLIST}.
     * Ignored for other policies.
     */
    private List<String> allowedUserEmails;

    /**
     * Optional default folder ID for approved documents.
     * Must belong to the authenticated owner.
     */
    private Long defaultFolderId;
}
