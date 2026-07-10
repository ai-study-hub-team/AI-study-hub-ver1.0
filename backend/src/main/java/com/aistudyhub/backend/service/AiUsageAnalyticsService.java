package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.UsageChartPointResponse;
import com.aistudyhub.backend.dto.response.UsageChartResponse;
import com.aistudyhub.backend.dto.response.UsageStatsResponse;
import com.aistudyhub.backend.entity.AiUsageEvent;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.AiFeatureType;
import com.aistudyhub.backend.enums.UsagePeriod;
import com.aistudyhub.backend.repository.AiUsageEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for AI usage analytics.
 *
 * <p><b>Two responsibilities:</b>
 * <ol>
 *   <li>{@link #recordEvent} — called by ChatSessionService / QuizService / SummaryService
 *       after a successful AI operation.</li>
 *   <li>{@link #getStats} / {@link #getChartData} — serve the analytics API endpoints.</li>
 * </ol>
 *
 * <p><b>Timezone:</b> All period boundaries are computed using {@code LocalDate.now()} which
 * uses the JVM default timezone (set via OS or {@code -Duser.timezone} / {@code spring.jackson.time-zone}).
 * Ensure the JVM timezone is consistent with the frontend expectation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageAnalyticsService {

    public static final ZoneId APP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DAY_LABEL_FMT   = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_LABEL_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final AiUsageEventRepository eventRepository;
    private final AiUsageEventWriter aiUsageEventWriter;

    // ─── Record event (called by feature services) ─────────────────────────────

    /**
     * Saves one AI usage event after a successful feature execution.
     *
     * <p>This method determines if a transaction is active. If so, it defers
     * the save until after commit. If not, it saves immediately.
     *
     * <p>Callers should wrap this in try-catch so that an analytics failure
     * never propagates to the user-facing response.
     *
     * @param user        the authenticated user
     * @param featureType CHAT / QUIZ / SUMMARY
     * @param documentId  optional linked document (null for GENERAL_CHAT)
     */
    public void recordEvent(User user, AiFeatureType featureType, Long documentId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        aiUsageEventWriter.saveInNewTransaction(user, featureType, documentId);
                    } catch (Exception e) {
                        log.error("[AiUsageAnalytics] Failed to record {} event in afterCommit: {}", featureType, e.getMessage());
                    }
                }
            });
        } else {
            try {
                aiUsageEventWriter.saveInNewTransaction(user, featureType, documentId);
            } catch (Exception e) {
                log.error("[AiUsageAnalytics] Failed to record {} event immediately: {}", featureType, e.getMessage());
            }
        }
    }

    // ─── Stats summary ─────────────────────────────────────────────────────────

    /**
     * Returns aggregated CHAT / QUIZ / SUMMARY counts for the current user within the
     * specified period.
     *
     * <p>Uses a single grouped DB query — no per-feature repeated queries.
     */
    @Transactional(readOnly = true)
    public UsageStatsResponse getStats(Long userId, UsagePeriod period) {
        LocalDateTime[] bounds = periodBounds(period);
        LocalDateTime from = bounds[0];
        LocalDateTime to   = bounds[1];

        // Single grouped query: [[CHAT, 15], [QUIZ, 4], [SUMMARY, 7]]
        List<Object[]> rows = eventRepository.countByFeatureTypeInRange(userId, from, to);

        long chatCount    = 0;
        long quizCount    = 0;
        long summaryCount = 0;

        for (Object[] row : rows) {
            AiFeatureType ft = (AiFeatureType) row[0];
            long count = (Long) row[1];
            switch (ft) {
                case CHAT    -> chatCount    = count;
                case QUIZ    -> quizCount    = count;
                case SUMMARY -> summaryCount = count;
            }
        }

        return UsageStatsResponse.builder()
                .period(period)
                .from(from)
                .to(to)
                .chatCount(chatCount)
                .quizCount(quizCount)
                .summaryCount(summaryCount)
                .totalCount(chatCount + quizCount + summaryCount)
                .build();
    }

    // ─── Chart data ────────────────────────────────────────────────────────────

    /**
     * Returns time-bucketed usage data for chart rendering.
     *
     * <p>Bucket rules:
     * <ul>
     *   <li>DAY   → one aggregate bucket for the day</li>
     *   <li>WEEK  → 7 daily buckets (Mon–Sun)</li>
     *   <li>MONTH → one bucket per day of the current calendar month</li>
     *   <li>YEAR  → 12 monthly buckets (Jan–Dec)</li>
     * </ul>
     *
     * <p>Zero-value buckets are always included so the frontend never needs
     * to fill gaps.
     */
    @Transactional(readOnly = true)
    public UsageChartResponse getChartData(Long userId, UsagePeriod period) {
        LocalDateTime[] bounds = periodBounds(period);
        LocalDateTime from = bounds[0];
        LocalDateTime to   = bounds[1];

        // Fetch all raw events in range (grouping is done in Java to stay DB-agnostic)
        List<AiUsageEvent> events = eventRepository.findByUserInRange(userId, from, to);

        List<UsageChartPointResponse> dataPoints = switch (period) {
            case DAY   -> buildDailyBuckets(events, from, to, 1);
            case WEEK  -> buildDailyBuckets(events, from, to, 7);
            case MONTH -> buildDailyBuckets(events, from, to, from.toLocalDate().lengthOfMonth());
            case YEAR  -> buildMonthlyBuckets(events, from);
        };

        return UsageChartResponse.builder()
                .period(period)
                .from(from)
                .to(to)
                .data(dataPoints)
                .build();
    }

    // ─── Period boundary computation ───────────────────────────────────────────

    /**
     * Computes [from, to) for the given period relative to the current local date.
     *
     * <pre>
     * DAY   → today 00:00 .. tomorrow 00:00
     * WEEK  → Monday 00:00 of this week .. next Monday 00:00
     * MONTH → first of this month 00:00 .. first of next month 00:00
     * YEAR  → Jan 1 this year 00:00 .. Jan 1 next year 00:00
     * </pre>
     */
    LocalDateTime[] periodBounds(UsagePeriod period) {
        LocalDate today = LocalDate.now(APP_ZONE);
        return switch (period) {
            case DAY -> new LocalDateTime[]{
                    today.atStartOfDay(),
                    today.plusDays(1).atStartOfDay()
            };
            case WEEK -> {
                LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield new LocalDateTime[]{
                        monday.atStartOfDay(),
                        monday.plusWeeks(1).atStartOfDay()
                };
            }
            case MONTH -> {
                LocalDate firstOfMonth = today.with(TemporalAdjusters.firstDayOfMonth());
                yield new LocalDateTime[]{
                        firstOfMonth.atStartOfDay(),
                        firstOfMonth.plusMonths(1).atStartOfDay()
                };
            }
            case YEAR -> {
                LocalDate jan1 = LocalDate.of(today.getYear(), 1, 1);
                yield new LocalDateTime[]{
                        jan1.atStartOfDay(),
                        jan1.plusYears(1).atStartOfDay()
                };
            }
        };
    }

    // ─── Chart bucket builders ─────────────────────────────────────────────────

    /**
     * Builds {@code numDays} daily buckets starting from {@code from}.
     * Each bucket has label "yyyy-MM-dd".
     * Zero-value buckets are always included.
     */
    private List<UsageChartPointResponse> buildDailyBuckets(
            List<AiUsageEvent> events, LocalDateTime from, LocalDateTime to, int numDays) {

        // Group events by day label
        Map<String, long[]> counts = new LinkedHashMap<>();
        for (AiUsageEvent e : events) {
            String label = e.getCreatedAt().toLocalDate().format(DAY_LABEL_FMT);
            counts.computeIfAbsent(label, k -> new long[3]); // [chat, quiz, summary]
            switch (e.getFeatureType()) {
                case CHAT    -> counts.get(label)[0]++;
                case QUIZ    -> counts.get(label)[1]++;
                case SUMMARY -> counts.get(label)[2]++;
            }
        }

        // Generate all expected labels (zero-filled)
        List<UsageChartPointResponse> result = new ArrayList<>();
        LocalDate cursor = from.toLocalDate();
        for (int i = 0; i < numDays; i++) {
            String label = cursor.format(DAY_LABEL_FMT);
            long[] c = counts.getOrDefault(label, new long[3]);
            result.add(UsageChartPointResponse.builder()
                    .label(label)
                    .chatCount(c[0])
                    .quizCount(c[1])
                    .summaryCount(c[2])
                    .totalCount(c[0] + c[1] + c[2])
                    .build());
            cursor = cursor.plusDays(1);
        }
        return result;
    }

    /**
     * Builds 12 monthly buckets for the year starting at {@code from}.
     * Each bucket has label "yyyy-MM".
     */
    private List<UsageChartPointResponse> buildMonthlyBuckets(
            List<AiUsageEvent> events, LocalDateTime from) {

        Map<String, long[]> counts = new LinkedHashMap<>();
        for (AiUsageEvent e : events) {
            String label = YearMonth.from(e.getCreatedAt()).format(MONTH_LABEL_FMT);
            counts.computeIfAbsent(label, k -> new long[3]);
            switch (e.getFeatureType()) {
                case CHAT    -> counts.get(label)[0]++;
                case QUIZ    -> counts.get(label)[1]++;
                case SUMMARY -> counts.get(label)[2]++;
            }
        }

        List<UsageChartPointResponse> result = new ArrayList<>();
        YearMonth cursor = YearMonth.from(from);
        for (int i = 0; i < 12; i++) {
            String label = cursor.format(MONTH_LABEL_FMT);
            long[] c = counts.getOrDefault(label, new long[3]);
            result.add(UsageChartPointResponse.builder()
                    .label(label)
                    .chatCount(c[0])
                    .quizCount(c[1])
                    .summaryCount(c[2])
                    .totalCount(c[0] + c[1] + c[2])
                    .build());
            cursor = cursor.plusMonths(1);
        }
        return result;
    }
}
