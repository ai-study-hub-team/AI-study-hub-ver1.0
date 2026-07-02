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

    // Uploader (User B) info
    private Long uploaderUserId;
    private String uploaderName;
    private String uploaderEmail;

    // File info
    private String originalFileName;
    private String fileType;
    private Long fileSize;

    // Content provided by User B
    private String title;
    private String description;

    // Review state
    private SharedSubmissionStatus status;
    private Long approvedDocumentId;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private Long reviewedBy;
    private String rejectReason;
}
