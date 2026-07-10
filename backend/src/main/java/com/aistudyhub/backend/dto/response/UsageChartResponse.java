package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.enums.UsagePeriod;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response for {@code GET /api/usage/chart?period=...}.
 * Time-bucketed usage data suitable for rendering charts.
 */
@Getter
@Builder
public class UsageChartResponse {

    private UsagePeriod period;
    private LocalDateTime from;
    private LocalDateTime to;

    /**
     * Ordered list of time buckets covering the entire period.
     * Buckets with zero activity are always included (no gaps).
     */
    private List<UsageChartPointResponse> data;
}
