package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A file submitted by an authenticated user (User B) through a share link.
 *
 * <h3>Storage model</h3>
 * The file is uploaded directly to Cloudinary at submission time. There is no local
 * staging directory. The Cloudinary object exists (and occupies the owner's quota)
 * for the full lifetime of the submission — from creation until rejection/expiration.
 *
 * <h3>Quota accounting invariants</h3>
 * <ul>
 *   <li>Quota is charged to the share-link owner immediately after a successful cloud upload.
 *   <li>Approval: quota stays charged, Cloudinary object becomes the official Document. No re-upload.
 *   <li>Rejection/Expiration: Cloudinary object is deleted first, then quota released.
 *   <li>{@code quotaReleasedAt} is the idempotency marker — quota is never released twice.
 * </ul>
 *
 * <h3>Uploader identity</h3>
 * {@code uploaderUserId} is derived exclusively from the authenticated JWT principal.
 * Snapshot fields are historical copies captured at submission time.
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
     * The owner of the share link (User A). Denormalized for efficient ownership
     * queries without joining document_share_links.
     */
    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    // ─── Uploader identity (from authenticated principal only) ─────────────────

    @Column(name = "uploader_user_id", nullable = false)
    private Long uploaderUserId;

    @Column(name = "uploader_name_snapshot", length = 255)
    private String uploaderNameSnapshot;

    @Column(name = "uploader_email_snapshot", length = 254)
    private String uploaderEmailSnapshot;

    // ─── Cloud storage identifiers ─────────────────────────────────────────────

    /**
     * Cloudinary public ID. Required to retrieve or delete the cloud object.
     * Never null for submissions created by this version.
     */
    @Column(name = "cloud_public_id", length = 500)
    private String cloudPublicId;

    /**
     * Cloudinary secure_url for direct access.
     * May be used for preview/download when the owner is authorized.
     */
    @Column(name = "cloud_secure_url", length = 1000)
    private String cloudSecureUrl;

    /**
     * Cloudinary resource_type (image / video / raw).
     * Required when constructing deletion or delivery URLs.
     */
    @Column(name = "cloud_resource_type", length = 20)
    private String cloudResourceType;

    // ─── File metadata ─────────────────────────────────────────────────────────

    /** Original file name as provided by the uploader's browser. */
    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    /** MIME type detected server-side from the uploaded file. */
    @Column(name = "file_type", length = 255)
    private String fileType;

    /**
     * Byte count charged to the owner's quota.
     * Equals the file size reported by Cloudinary after upload.
     */
    @Column(name = "file_size")
    private Long fileSize;

    // ─── Content metadata ──────────────────────────────────────────────────────

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // ─── Review state ──────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SharedSubmissionStatus status = SharedSubmissionStatus.PENDING_REVIEW;

    /** ID of the official Document created after approval. Null until approved. */
    @Column(name = "approved_document_id")
    private Long approvedDocumentId;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    /**
     * Deadline for automatic removal of PENDING_REVIEW submissions (30 days from creation).
     * Cleared to null on approval. Kept non-null on rejection until cloud cleanup completes.
     */
    @Column(name = "delete_after")
    private LocalDateTime deleteAfter;

    // ─── Quota accounting ──────────────────────────────────────────────────────

    /**
     * The user whose quota was charged. Equals ownerUserId.
     * Stored redundantly to guard against link deletion before cleanup.
     */
    @Column(name = "quota_owner_id")
    private Long quotaOwnerId;

    /**
     * Idempotency marker for quota release.
     * Set atomically via {@code atomicClaimQuotaRelease} — never via Java null check alone.
     * If non-null, quota has already been released — do NOT release again.
     */
    @Column(name = "quota_released_at")
    private LocalDateTime quotaReleasedAt;

    // ─── Cloud cleanup state ───────────────────────────────────────────────────

    /**
     * If the Cloudinary deletion failed during rejection/expiration, the public ID
     * is recorded here so cleanup can be retried. Null when no retry is needed.
     */
    @Column(name = "cloud_delete_failed_id", length = 500)
    private String cloudDeleteFailedId;

    /**
     * Number of cloud-deletion retry attempts by the scheduler.
     */
    @Column(name = "cloud_delete_attempts", nullable = false)
    @Builder.Default
    private int cloudDeleteAttempts = 0;

    /** Soft-delete audit fields. Deleted submissions are hidden from the owner list. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    @PrePersist
    void prePersist() {
        if (submittedAt == null) submittedAt = LocalDateTime.now();
    }
}
