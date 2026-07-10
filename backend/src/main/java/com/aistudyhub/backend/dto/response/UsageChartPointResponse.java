package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * A single time-bucket inside {@link UsageChartResponse#getData()}.
 *
 * <ul>
 *   <li>For DAY period: one bucket per day (label = "yyyy-MM-dd")</li>
 *   <li>For WEEK period: one bucket per day of the week (label = "yyyy-MM-dd")</li>
 *   <li>For MONTH period: one bucket per day of the month (label = "yyyy-MM-dd")</li>
 *   <li>For YEAR period: one bucket per month (label = "yyyy-MM")</li>
 * </ul>
 *
 * Zero values are always included so the frontend never needs to fill gaps.
 */
@Getter
@Builder
public class UsageChartPointResponse {

    /** Human-readable bucket label. Format depends on period. */
    private String label;

    private long chatCount;
    private long quizCount;
    private long summaryCount;
    private long totalCount;
}
