package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A share link created by User A (owner) that lets authenticated users (User B)
 * upload documents as pending submissions, subject to access-policy enforcement.
 *
 * <h3>Security model</h3>
 * <ul>
 *   <li>Only the SHA-256 hash of the token is stored — never the plain token.
 *   <li>Possession of the token alone is not sufficient to upload;
 *       the requester must also be authenticated and pass the access-policy check.
 * </ul>
 *
 * <h3>Storage accounting</h3>
 * Staged files count against {@code owner.totalStorageUsedBytes} from the moment
 * they are written to disk.  No separate link-level byte counter is maintained;
 * all quota truth lives in {@link User#getTotalStorageUsedBytes()}.
 */
@Entity
@Table(name = "document_share_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentShareLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** User A — the owner who created this link. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    /**
     * SHA-256 hash of the public token.
     * The plain token is never persisted — returned only at creation time.
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /** Display title shown to uploaders on the upload page. */
    @Column(length = 255)
    private String title;

    /** Optional description / instructions for uploaders. */
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DocumentShareStatus status = DocumentShareStatus.ACTIVE;

    // ─── Access policy ────────────────────────────────────────────────────────

    /**
     * Who is allowed to upload through this link.
     *
     * <ul>
     *   <li>{@code PRIVATE_ALLOWLIST} (default) – only users in {@link #allowedUsers}.
     *   <li>{@code ANY_AUTHENTICATED_USER} – any authenticated system user.
     *   <li>{@code GROUP} / {@code ORGANIZATION} – reserved; not yet supported.
     * </ul>
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "access_policy", nullable = false, length = 30)
    @Builder.Default
    private ShareLinkAccessPolicy accessPolicy = ShareLinkAccessPolicy.PRIVATE_ALLOWLIST;

    /**
     * Explicit allowlist (used when accessPolicy = PRIVATE_ALLOWLIST).
     * Empty list means nobody can upload until the owner grants access.
     */
    @OneToMany(mappedBy = "shareLink", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DocumentShareLinkAllowedUser> allowedUsers = new ArrayList<>();

    // ─── Upload limits ─────────────────────────────────────────────────────────

    /** When this link expires. Null = no expiry. */
    private LocalDateTime expiresAt;

    /** Maximum total submissions accepted through this link. Null = unlimited. */
    private Integer maxUploads;

    /** Maximum submissions per uploader (by userId). Null = unlimited. */
    @Column(name = "max_uploads_per_user")
    private Integer maxUploadsPerUser;

    /**
     * Maximum total bytes that may be staged through this link.
     * Null = unlimited (subject to owner quota).
     */
    @Column(name = "max_total_bytes")
    private Long maxTotalBytes;

    /**
     * Maximum file size in bytes per upload.
     * Null = use the owner's plan-level per-file limit.
     */
    @Column(name = "max_file_size_bytes")
    private Long maxFileSizeBytes;

    /**
     * Comma-separated list of allowed MIME types (e.g. "application/pdf,image/png").
     * Null or blank = accept all types permitted by the owner's plan.
     */
    @Column(name = "allowed_file_types", length = 1000)
    private String allowedFileTypes;

    // ─── Counters ─────────────────────────────────────────────────────────────

    /**
     * Total successfully created submissions (PENDING + APPROVED + REJECTED + EXPIRED).
     * Incremented only after a submission record is persisted.
     * Never decremented — used solely as an upload-count limit gate.
     */
    @Column(name = "current_uploads", nullable = false)
    @Builder.Default
    private int currentUploads = 0;

    /**
     * Total bytes of submissions that currently occupy managed storage
     * (PENDING_REVIEW status). Updated when submissions are created and cleaned up.
     * Used to enforce {@link #maxTotalBytes} on the link.
     * This is a convenience denormalized counter; {@link User#getTotalStorageUsedBytes()}
     * remains the authoritative quota source.
     */
    @Column(name = "active_stored_bytes", nullable = false)
    @Builder.Default
    private long activeStoredBytes = 0L;

    // ─── Folder default ────────────────────────────────────────────────────────

    /**
     * Optional default folder for approved documents.
     * Used as a fallback during approval when the approver does not specify a folderId.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_folder_id")
    private Folder defaultFolder;

    // ─── Audit ─────────────────────────────────────────────────────────────────

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
