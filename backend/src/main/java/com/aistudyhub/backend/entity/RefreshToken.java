package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "refresh_tokens",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_refresh_tokens_token",
                columnNames = "token"
        ),
        indexes = {
                @Index(
                        name = "idx_refresh_tokens_user_revoked",
                        columnList = "user_id, revoked"
                ),
                @Index(
                        name = "idx_refresh_tokens_expired_at",
                        columnList = "expired_at"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_refresh_tokens_user")
    )
    private User user;

    // Lưu SHA-256 hex của refresh token thô, độ dài 64 ký tự.
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "expired_at", nullable = false)
    private Instant expiredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
