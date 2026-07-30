package com.aistudyhub.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Owner-controlled configuration for an existing document share link.
 *
 * <p>The access policy and allowlist are intentionally not included. They are
 * managed separately and the policy chosen at link creation cannot be changed.
 */
@Getter
@Setter
public class DocumentShareLinkUpdateRequest {

    /** When the link expires. Null = no expiry. */
    private LocalDateTime expiresAt;

    /** Maximum total submissions accepted. Null = unlimited. */
    private Integer maxUploads;

    /** Maximum submissions per authenticated uploader. Null = unlimited. */
    private Integer maxUploadsPerUser;

    /** Maximum size in bytes for each upload. Null = use the owner's plan limit. */
    private Long maxFileSizeBytes;

    /** Maximum total staged bytes through this link. Null = unlimited. */
    private Long maxTotalBytes;

    /** Comma-separated allowed MIME types. Null or blank = no link-specific restriction. */
    private String allowedFileTypes;
}
