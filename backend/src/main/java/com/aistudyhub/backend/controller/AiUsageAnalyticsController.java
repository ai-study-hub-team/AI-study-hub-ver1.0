package com.aistudyhub.backend.controller;

import com.aistudyhub.backend.dto.response.UsageChartResponse;
import com.aistudyhub.backend.dto.response.UsageStatsResponse;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.UsagePeriod;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.service.AiUsageAnalyticsService;
import com.aistudyhub.backend.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Analytics endpoints for the currently authenticated user.
 * User identity is always derived from the JWT — never from a query parameter.
 *
 * <pre>
 * GET /api/usage/stats?period=DAY|WEEK|MONTH|YEAR
 * GET /api/usage/chart?period=DAY|WEEK|MONTH|YEAR
 * </pre>
 */
@RestController
@RequestMapping("/api/usage")
@RequiredArgsConstructor
@Slf4j
public class AiUsageAnalyticsController {

    private final AiUsageAnalyticsService analyticsService;
    private final CurrentUserService currentUserService;

    /**
     * Returns aggregated CHAT / QUIZ / SUMMARY counts for the current user within the period.
     *
     * <p>Example:
     * <pre>
     * GET /api/usage/stats?period=DAY
     * Authorization: Bearer &lt;jwt&gt;
     * →
     * {
     *   "period": "DAY",
     *   "from": "2026-07-10T00:00:00",
     *   "to":   "2026-07-11T00:00:00",
     *   "chatCount": 15,
     *   "quizCount": 4,
     *   "summaryCount": 7,
     *   "totalCount": 26
     * }
     * </pre>
     */
    @GetMapping("/stats")
    public ResponseEntity<UsageStatsResponse> getStats(
            @RequestParam String period) {

        UsagePeriod usagePeriod = parsePeriod(period);
        User user = currentUserService.getCurrentUser();

        log.debug("[UsageAnalytics] stats requested by userId={}, period={}", user.getId(), usagePeriod);
        return ResponseEntity.ok(analyticsService.getStats(user.getId(), usagePeriod));
    }

    /**
     * Returns time-bucketed usage data suitable for chart rendering.
     *
     * <p>Bucket granularity:
     * <ul>
     *   <li>DAY   → 1 daily bucket</li>
     *   <li>WEEK  → 7 daily buckets (Mon–Sun)</li>
     *   <li>MONTH → one per day in the current calendar month</li>
     *   <li>YEAR  → 12 monthly buckets (Jan–Dec)</li>
     * </ul>
     *
     * <p>Zero-value buckets are always included — no gaps.
     *
     * <p>Example:
     * <pre>
     * GET /api/usage/chart?period=WEEK
     * Authorization: Bearer &lt;jwt&gt;
     * →
     * {
     *   "period": "WEEK",
     *   "from": "2026-07-06T00:00:00",
     *   "to":   "2026-07-13T00:00:00",
     *   "data": [
     *     {"label": "2026-07-06", "chatCount": 5, "quizCount": 1, "summaryCount": 2, "totalCount": 8},
     *     {"label": "2026-07-07", "chatCount": 8, "quizCount": 2, "summaryCount": 1, "totalCount": 11},
     *     ...
     *   ]
     * }
     * </pre>
     */
    @GetMapping("/chart")
    public ResponseEntity<UsageChartResponse> getChart(
            @RequestParam String period) {

        UsagePeriod usagePeriod = parsePeriod(period);
        User user = currentUserService.getCurrentUser();

        log.debug("[UsageAnalytics] chart requested by userId={}, period={}", user.getId(), usagePeriod);
        return ResponseEntity.ok(analyticsService.getChartData(user.getId(), usagePeriod));
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    /**
     * Parses the period string, throwing a clean 400 instead of 500 on invalid input.
     *
     * @throws BadRequestException (→ HTTP 400) if period is not DAY/WEEK/MONTH/YEAR
     */
    private UsagePeriod parsePeriod(String period) {
        try {
            return UsagePeriod.valueOf(period.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Invalid period '" + period + "'. Allowed values: DAY, WEEK, MONTH, YEAR.");
        }
    }
}
