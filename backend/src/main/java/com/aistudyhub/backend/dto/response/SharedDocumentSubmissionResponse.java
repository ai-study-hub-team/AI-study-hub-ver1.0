package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.entity.SharedSubmissionStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Flat response for a SharedDocumentSubmission — no JPA entities, no lazy-loading.
 */
@Getter
@Setter
@Builder
public class SharedDocumentSubmissionResponse {

    private Long id;
    private Long shareLinkId;
    private String shareLinkTitle;
    private Long ownerUserId;

    // Uploader (User B) info — sourced from authenticated principal, not client input
    private Long uploaderUserId;
    /** Display name snapshot of the uploader at submission time. */
    private String uploaderName;
    /** Email snapshot of the uploader at submission time. */
    private String uploaderEmail;

    // File info
    private String originalFileName;
    private String fileType;
    /** Actual byte count verified server-side. */
    private Long fileSize;
    private String cloudPublicId;
    private String cloudSecureUrl;
    private String cloudResourceType;

    // Content provided by the uploader
    private String title;
    private String description;

    // Review state
    private SharedSubmissionStatus status;
    private Long approvedDocumentId;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private Long reviewedBy;
    private String rejectReason;

    /**
     * Deadline for automatic removal if still PENDING_REVIEW.
     * Null once the submission is approved (scheduler will not touch it).
     */
    private LocalDateTime deleteAfter;

    /**
     * When quota was released for this submission.
     * Non-null means quota has already been released.
     */
    private LocalDateTime quotaReleasedAt;
}
