package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "email_verification_tokens",
        indexes = {
                @Index(name = "idx_email_verification_tokens_user_type_created", columnList = "user_id, token_type, created_at"),
                @Index(name = "idx_email_verification_tokens_token", columnList = "token")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_email_verification_tokens_token",
                columnNames = "token"
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 128)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(name = "token_type", nullable = false, length = 50)
    private EmailVerificationTokenType tokenType;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "is_used", nullable = false)
    @Builder.Default
    private boolean used = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_ip", length = 100)
    private String createdIp;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "resend_count", nullable = false)
    @Builder.Default
    private int resendCount = 0;

    @Column(name = "last_sent_at", nullable = false)
    private LocalDateTime lastSentAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (tokenType == null) {
            tokenType = EmailVerificationTokenType.EMAIL_VERIFICATION;
        }
        if (lastSentAt == null) {
            lastSentAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

