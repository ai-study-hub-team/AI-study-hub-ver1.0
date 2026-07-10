package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.enums.UsagePeriod;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Response for {@code GET /api/usage/stats?period=...}.
 * Counts of successful AI feature executions within the requested period.
 */
@Getter
@Builder
public class UsageStatsResponse {

    /** The requested period (DAY / WEEK / MONTH / YEAR). */
    private UsagePeriod period;

    /** Inclusive start of the period window. */
    private LocalDateTime from;

    /** Exclusive end of the period window. */
    private LocalDateTime to;

    /** Number of successful CHAT executions. */
    private long chatCount;

    /** Number of successful QUIZ generations. */
    private long quizCount;

    /** Number of successful SUMMARY generations. */
    private long summaryCount;

    /** Sum of chatCount + quizCount + summaryCount. */
    private long totalCount;
}
