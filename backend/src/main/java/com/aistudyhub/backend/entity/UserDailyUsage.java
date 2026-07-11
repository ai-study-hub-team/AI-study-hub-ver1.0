package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_daily_usages",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_daily_usage",
                columnNames = {"user_id", "usage_date"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDailyUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate usageDate;

    @Column(nullable = false)
    @Builder.Default
    private Long chatTokens = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long summaryTokens = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long quizTokens = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long extractTokens = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long totalTokens = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long overallTokens = 0L;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
