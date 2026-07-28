package com.aistudyhub.backend.entity;

import com.aistudyhub.backend.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    /*
     * Immutable benefit snapshot for this subscription period.
     *
     * The plan relation identifies the catalog plan. Quota enforcement must use
     * these fields so editing the catalog does not rewrite benefits that a user
     * has already purchased.
     */
    @Column(name = "snapshot_storage_limit_mb")
    private Long snapshotStorageLimitMb;

    @Column(name = "snapshot_max_upload_size_per_file_mb")
    private Long snapshotMaxUploadSizePerFileMb;

    @Column(name = "snapshot_daily_token_limit")
    private Long snapshotDailyTokenLimit;

    @Column(name = "snapshot_allow_image_upload")
    private Boolean snapshotAllowImageUpload;

    @Column(name = "snapshot_allow_document_upload")
    private Boolean snapshotAllowDocumentUpload;

    @Column(name = "snapshot_allow_video_upload")
    private Boolean snapshotAllowVideoUpload;

    @Column(name = "snapshot_allow_audio_upload")
    private Boolean snapshotAllowAudioUpload;

    @Column(nullable = false)
    private LocalDateTime startDate;

    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "expiry_reminder_7_days_sent_at")
    private LocalDateTime expiryReminder7DaysSentAt;

    @Column(name = "expired_notification_sent_at")
    private LocalDateTime expiredNotificationSentAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        snapshotPlanBenefitsIfMissing();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (startDate == null) {
            startDate = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Starts a new entitlement period using the plan's benefits at this moment.
     */
    public void snapshotPlanBenefits() {
        if (plan == null) {
            throw new IllegalStateException("Cannot snapshot subscription benefits without a plan");
        }

        snapshotStorageLimitMb = plan.getStorageLimitMb();
        snapshotMaxUploadSizePerFileMb = plan.getMaxUploadSizePerFileMb();
        snapshotDailyTokenLimit = plan.getDailyTokenLimit();
        snapshotAllowImageUpload = plan.getAllowImageUpload();
        snapshotAllowDocumentUpload = plan.getAllowDocumentUpload();
        snapshotAllowVideoUpload = plan.getAllowVideoUpload();
        snapshotAllowAudioUpload = plan.getAllowAudioUpload();
    }

    /**
     * Backward-compatible backfill for subscriptions created before snapshots
     * were introduced. It never overwrites an existing snapshot.
     */
    public boolean snapshotPlanBenefitsIfMissing() {
        if (hasCompletePlanBenefitsSnapshot()) {
            return false;
        }

        if (plan == null) {
            throw new IllegalStateException("Cannot backfill subscription benefits without a plan");
        }

        if (snapshotStorageLimitMb == null) {
            snapshotStorageLimitMb = plan.getStorageLimitMb();
        }
        if (snapshotMaxUploadSizePerFileMb == null) {
            snapshotMaxUploadSizePerFileMb = plan.getMaxUploadSizePerFileMb();
        }
        if (snapshotDailyTokenLimit == null) {
            snapshotDailyTokenLimit = plan.getDailyTokenLimit();
        }
        if (snapshotAllowImageUpload == null) {
            snapshotAllowImageUpload = plan.getAllowImageUpload();
        }
        if (snapshotAllowDocumentUpload == null) {
            snapshotAllowDocumentUpload = plan.getAllowDocumentUpload();
        }
        if (snapshotAllowVideoUpload == null) {
            snapshotAllowVideoUpload = plan.getAllowVideoUpload();
        }
        if (snapshotAllowAudioUpload == null) {
            snapshotAllowAudioUpload = plan.getAllowAudioUpload();
        }
        return true;
    }

    public boolean hasCompletePlanBenefitsSnapshot() {
        return snapshotStorageLimitMb != null
                && snapshotMaxUploadSizePerFileMb != null
                && snapshotDailyTokenLimit != null
                && snapshotAllowImageUpload != null
                && snapshotAllowDocumentUpload != null
                && snapshotAllowVideoUpload != null
                && snapshotAllowAudioUpload != null;
    }

    public Long getEffectiveStorageLimitMb() {
        return snapshotStorageLimitMb != null ? snapshotStorageLimitMb : plan.getStorageLimitMb();
    }

    public Long getEffectiveMaxUploadSizePerFileMb() {
        return snapshotMaxUploadSizePerFileMb != null
                ? snapshotMaxUploadSizePerFileMb
                : plan.getMaxUploadSizePerFileMb();
    }

    public Long getEffectiveDailyTokenLimit() {
        return snapshotDailyTokenLimit != null ? snapshotDailyTokenLimit : plan.getDailyTokenLimit();
    }

    public Boolean getEffectiveAllowImageUpload() {
        return snapshotAllowImageUpload != null ? snapshotAllowImageUpload : plan.getAllowImageUpload();
    }

    public Boolean getEffectiveAllowDocumentUpload() {
        return snapshotAllowDocumentUpload != null
                ? snapshotAllowDocumentUpload
                : plan.getAllowDocumentUpload();
    }

    public Boolean getEffectiveAllowVideoUpload() {
        return snapshotAllowVideoUpload != null ? snapshotAllowVideoUpload : plan.getAllowVideoUpload();
    }

    public Boolean getEffectiveAllowAudioUpload() {
        return snapshotAllowAudioUpload != null ? snapshotAllowAudioUpload : plan.getAllowAudioUpload();
    }
}
