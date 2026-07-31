package com.aistudyhub.backend.entity;

import com.aistudyhub.backend.enums.UserAuthProvider;
import com.aistudyhub.backend.enums.UserRole;
import com.aistudyhub.backend.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;


@Entity
@Table(
        name = "users",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_users_email",
                columnNames = "email"
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false, length = 60)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserAuthProvider provider = UserAuthProvider.LOCAL;

    @Column(length = 255)
    private String providerId;

    @Column(length = 500)
    private String avatarUrl;

    @Column(length = 30)
    private String phone;

    @Column(length = 1000)
    private String bio;

    private LocalDateTime lastLoginAt;

    private LocalDateTime lastActiveAt;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "last_failed_login_at")
    private LocalDateTime lastFailedLoginAt;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "total_storage_used_bytes", nullable = false)
    @Builder.Default
    private Long totalStorageUsedBytes = 0L;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // One User -> Many Documents
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    // One User -> Many Categories
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Category> categories = new ArrayList<>();

    @PrePersist
    void prePersist() {
        normalizeEmail();
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (role == null) {
            role = UserRole.USER;
        }
        if (status == null) {
            status = UserStatus.ACTIVE;
        }

        if (provider == null) {
            provider = UserAuthProvider.LOCAL;
        }

        if (totalStorageUsedBytes == null) {
            totalStorageUsedBytes = 0L;
        }

        if (failedLoginAttempts == null) {
            failedLoginAttempts = 0;
        }
    }
    @PreUpdate
    void preUpdate() {
        normalizeEmail();
        updatedAt = LocalDateTime.now();
    }

    private void normalizeEmail() {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
    }
}
