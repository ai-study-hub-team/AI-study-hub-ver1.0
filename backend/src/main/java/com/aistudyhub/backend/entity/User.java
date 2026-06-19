package com.aistudyhub.backend.entity;

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