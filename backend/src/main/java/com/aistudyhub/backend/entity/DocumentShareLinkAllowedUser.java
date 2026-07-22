package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * An entry in the per-link allowlist that grants a specific user permission to upload
 * through the associated {@link DocumentShareLink} when
 * {@link ShareLinkAccessPolicy#PRIVATE_ALLOWLIST} is in effect.
 *
 * <h3>Invariants</h3>
 * <ul>
 *   <li>The combination of {@code (share_link_id, allowed_user_id)} is unique.
 *   <li>Only the share-link owner (or an admin) may add or remove entries.
 *   <li>{@code allowedUserId} is validated against the {@code users} table on creation.
 * </ul>
 */
@Entity
@Table(
    name = "document_share_link_allowed_users",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_dslau_link_user",
        columnNames = {"share_link_id", "allowed_user_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentShareLinkAllowedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The share link this access entry belongs to. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "share_link_id", nullable = false)
    private DocumentShareLink shareLink;

    /** The user who is allowed to upload. Foreign key validated on creation. */
    @Column(name = "allowed_user_id", nullable = false)
    private Long allowedUserId;

    /** The user who granted this access (must be the share-link owner). */
    @Column(name = "granted_by_user_id", nullable = false)
    private Long grantedByUserId;

    /** When this access entry was created. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
