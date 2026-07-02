package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents a user-owned folder that groups documents.
 *
 * <p>Folders support a single level of nesting via {@code parentFolder}.
 * Circular nesting is prevented at the service layer.
 * No bidirectional {@code @OneToMany} collections are declared here to
 * avoid Jackson infinite-recursion issues in responses.
 */
@Entity
@Table(name = "folders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display name — required, max 255 chars. */
    @Column(nullable = false, length = 255)
    private String name;

    /** Optional description of the folder's purpose. */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** Owner of this folder. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Optional parent folder.
     * {@code null} means this is a root-level folder.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_folder_id")
    private Folder parentFolder;

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
