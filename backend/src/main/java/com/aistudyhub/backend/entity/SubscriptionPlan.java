package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "subscription_plans",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_subscription_plan_code_version",
                columnNames = {"code", "version"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, columnDefinition = "integer default 1")
    @Builder.Default
    private Integer version = 1;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Long storageLimitMb;

    @Column(nullable = false)
    private Long maxUploadSizePerFileMb;

    @Column(nullable = false)
    private Long dailyTokenLimit;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowImageUpload = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowDocumentUpload = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowVideoUpload = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean allowAudioUpload = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(
            nullable = false,
            updatable = false,
            columnDefinition = "timestamp default CURRENT_TIMESTAMP"
    )
    private LocalDateTime effectiveFrom;

    private LocalDateTime supersededAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_version_id")
    private SubscriptionPlan previousVersion;

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
        if (effectiveFrom == null) {
            effectiveFrom = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
