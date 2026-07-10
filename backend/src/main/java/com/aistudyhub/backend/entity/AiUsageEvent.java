package com.aistudyhub.backend.entity;

import com.aistudyhub.backend.enums.AiFeatureType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Records a single successful AI feature execution.
 *
 * <p>One row is written per user-facing AI operation that completes successfully:
 * <ul>
 *   <li>{@link AiFeatureType#CHAT} — one row per successful {@code askChatbot()} call,
 *       regardless of whether it internally called the planner + answer or just the answer.</li>
 *   <li>{@link AiFeatureType#QUIZ} — one row when a new quiz is generated and persisted.</li>
 *   <li>{@link AiFeatureType#SUMMARY} — one row when a new summary is generated and persisted.</li>
 * </ul>
 *
 * <p>This table is intentionally separate from {@code token_usage_logs} (which tracks token
 * counts and is skipped when tokens == 0) and from {@code user_daily_usages} (which is a
 * daily aggregate and cannot support weekly/monthly/yearly per-feature counts).
 */
@Entity
@Table(
        name = "ai_usage_events",
        indexes = {
                @Index(name = "idx_ai_usage_events_user_created",
                        columnList = "user_id, created_at"),
                @Index(name = "idx_ai_usage_events_user_feature_created",
                        columnList = "user_id, feature_type, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user who triggered the AI feature. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Which AI feature was used. Stored as VARCHAR so new features are human-readable. */
    @Enumerated(EnumType.STRING)
    @Column(name = "feature_type", nullable = false, length = 30)
    private AiFeatureType featureType;

    /**
     * Optional: the document that the AI operation was performed on.
     * Null for GENERAL_CHAT or when not applicable.
     */
    @Column(name = "document_id")
    private Long documentId;

    /** Timestamp of the successful execution. Set by {@link #prePersist()} if null. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
