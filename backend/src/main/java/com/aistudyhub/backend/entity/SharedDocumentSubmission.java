package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A file submitted by User B through a share link.
 * Remains PENDING_REVIEW until User A approves or rejects it.
 *
 * <p>On approval, an official {@link Document} is created and
 * {@link #approvedDocumentId} is populated.
 * No AI processing happens until after the Document is created.
 */
@Entity
@Table(name = "shared_document_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedDocumentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The share link this submission came through. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "share_link_id", nullable = false)
    private DocumentShareLink shareLink;

    /**
     * The owner of the share link (User A).
     * Denormalised here for efficient ownership queries without joining share_links.
     */
    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    /** User B's ID if they were authenticated; null if they submitted anonymously. */
    @Column(name = "uploader_user_id")
    private Long uploaderUserId;

    /** Display name provided by User B. */
    @Column(name = "uploader_name", length = 255)
    private String uploaderName;

    /** Email provided by User B. */
    @Column(name = "uploader_email", length = 254)
    private String uploaderEmail;

    /** Original file name as provided by User B's browser. */
    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    /**
     * Relative path where the file is stored in the shared-submissions directory
     * (e.g. {@code shared-submissions/abc123.pdf}).
     * On approval, the file is copied to the main uploads directory.
     */
    @Column(name = "stored_file_path", length = 500)
    private String storedFilePath;

    /** Name of the file as saved on disk (UUID-based). */
    @Column(name = "stored_file_name", length = 255)
    private String storedFileName;

    /** MIME type detected from the uploaded file. */
    @Column(name = "file_type", length = 255)
    private String fileType;

    /** File size in bytes. */
    @Column(name = "file_size")
    private Long fileSize;

    /** Title / subject provided by User B. */
    @Column(length = 255)
    private String title;

    /** Note or description provided by User B. */
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SharedSubmissionStatus status = SharedSubmissionStatus.PENDING_REVIEW;

    /** ID of the official Document created after approval. Null until approved. */
    @Column(name = "approved_document_id")
    private Long approvedDocumentId;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    /** Timestamp when User A reviewed (approved or rejected). */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /** User ID of User A who reviewed this submission. */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    /** Reason for rejection; null if not rejected. */
    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    /**
     * Deadline for automatic removal of PENDING_REVIEW submissions.
     * Set to {@code submittedAt + 30 days} when the submission is created.
     * Cleared to {@code null} on approval so the scheduler never removes approved submissions.
     * Not set for REJECTED submissions (rejection is handled separately).
     */
    @Column(name = "delete_after")
    private LocalDateTime deleteAfter;

    @PrePersist
    void prePersist() {
        if (submittedAt == null) submittedAt = LocalDateTime.now();
    }
}
