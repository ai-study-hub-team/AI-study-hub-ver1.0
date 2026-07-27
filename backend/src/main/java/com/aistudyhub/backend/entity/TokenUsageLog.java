package com.aistudyhub.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "token_usage_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String featureType; // e.g. "CHAT", "SUMMARY", "QUIZ"

    @Column(nullable = false, length = 100)
    private String modelName;

    @Column(nullable = false)
    private Long tokens;

    @Column(nullable = false)
    @Builder.Default
    private Long inputToken = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long outputToken = 0L;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pricing_id")
    private TokenPricing pricing;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal inputPricePerMillion;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal outputPricePerMillion;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "USD";

    @Column(nullable = false, precision = 19, scale = 12)
    private BigDecimal inputCost;

    @Column(nullable = false, precision = 19, scale = 12)
    private BigDecimal outputCost;

    @Column(nullable = false, precision = 19, scale = 12)
    private BigDecimal totalCost;

    private Long documentId;

    private String requestId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
