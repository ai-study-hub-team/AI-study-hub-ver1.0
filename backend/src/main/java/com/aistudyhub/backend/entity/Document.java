package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    // Short description of the document
    private String description;

    // Tags for searching, e.g. "java,spring,backend"
    private String tags;

    // Status: ACTIVE or DELETED (soft delete)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DocumentProcessStatus processStatus = DocumentProcessStatus.UPLOADED;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // ─── Processing metadata ──────────────────────────────────────────────────

    /** Timestamp of the last successful or failed processing attempt. */
    private LocalDateTime processedAt;

    /** Error message from the last failed processing attempt; null when successful. */
    @Column(columnDefinition = "TEXT")
    private String processErrorMessage;

    /** Number of chunks saved after the last successful processing. */
    private Integer chunkCount;


    // Many Documents -> One User
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // Many Documents -> One Category
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    // One Document -> One CloudFile
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "cloud_file_id", referencedColumnName = "id")
    private CloudFile cloudFile;

    /**
     * The folder this document belongs to.
     * {@code null} means the document is at root level (no folder).
     * Folder is pure metadata — does not affect AI processing.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    // ─── Shared-upload provenance ────────────────────────────────────────────

    /**
     * How this document was created.
     * DIRECT_UPLOAD = owner uploaded it themselves (default).
     * SHARED_UPLOAD = created from an approved SharedDocumentSubmission.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DocumentSourceType sourceType = DocumentSourceType.DIRECT_UPLOAD;

    /** ID of the SharedDocumentSubmission that was approved to create this document. Null for direct uploads. */
    private Long sourceSubmissionId;

    /** User ID of the person who submitted the file via the shared link (User B). Null for direct uploads. */
    private Long contributedByUserId;

    /** Display name provided by the submitter (User B). */
    @Column(length = 255)
    private String contributedByName;

    /** Email provided by the submitter (User B). */
    @Column(length = 254)
    private String contributedByEmail;

    // ─── Trash / soft-delete ─────────────────────────────────────────────────

    /** True when the document has been moved to trash (not yet permanently deleted). */
    @Column(nullable = false)
    @Builder.Default
    private boolean isTrashed = false;

    /** Timestamp when the document was moved to trash. */
    private LocalDateTime trashedAt;

    /**
     * Deadline for permanent deletion (trashedAt + 30 days).
     * The nightly scheduler hard-deletes documents where is_trashed=true AND delete_after <= now().
     */
    private LocalDateTime deleteAfter;

    /** ID of the user who moved this document to trash. */
    private Long trashedBy;
}
