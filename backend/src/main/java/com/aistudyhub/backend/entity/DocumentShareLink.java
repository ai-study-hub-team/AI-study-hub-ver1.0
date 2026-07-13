package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A share link created by User A (owner) that lets anonymous users (User B)
 * upload documents as pending submissions.
 *
 * <p>Only the hashed token is stored — never the plain token.
 * The plain token is returned to User A at creation time and never stored.
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
     * The plain token is never persisted. (Note: historical comment; plain token is now optionally persisted)
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /**
     * The original generated token, stored so User A can view and copy the link later.
     * Null for old links created before this field was added.
     */
    @Column(name = "plain_token", length = 255)
    private String plainToken;

    /** Display title shown to User B on the public upload page. */
    @Column(length = 255)
    private String title;

    /** Optional description/instructions for User B. */
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DocumentShareStatus status = DocumentShareStatus.ACTIVE;

    /** When this link expires. Null = no expiry. */
    private LocalDateTime expiresAt;

    /** Maximum number of submissions accepted. Null = unlimited. */
    private Integer maxUploads;

    /** Current count of submissions received (PENDING + APPROVED + REJECTED). */
    @Column(nullable = false)
    @Builder.Default
    private int currentUploads = 0;

    /**
     * Optional default folder for approved documents.
     * User A picks this when creating the link; it is used as a fallback during approval
     * if the approver does not specify an explicit folderId.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_folder_id")
    private Folder defaultFolder;

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
