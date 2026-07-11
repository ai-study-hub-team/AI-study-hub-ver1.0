package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.projection.TokenUsageDailyAggregate;
import com.aistudyhub.backend.dto.response.TokenUsageDailyResponse;
import com.aistudyhub.backend.dto.response.TokenUsageReportResponse;
import com.aistudyhub.backend.dto.response.TokenUsageTotalsResponse;
import com.aistudyhub.backend.enums.TokenUsageReportPeriod;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.UserDailyUsageRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TokenUsageReportService {

    private final UserDailyUsageRepository userDailyUsageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public TokenUsageReportResponse getReport(
            Long userId,
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        TokenUsageReportPeriod reportPeriod = parsePeriod(period);
        DateRange range = resolveDateRange(reportPeriod, date, fromDate, toDate);

        if (userId != null && !userRepository.existsById(userId)) {
            throw new NotFoundException("User not found with id: " + userId);
        }

        List<TokenUsageDailyAggregate> rows = userId == null
                ? userDailyUsageRepository.aggregateAllUsersByDateRange(range.fromDate(), range.toDate())
                : userDailyUsageRepository.aggregateUserByDateRange(userId, range.fromDate(), range.toDate());

        Map<LocalDate, TokenUsageDailyResponse> usageByDate = new LinkedHashMap<>();
        for (LocalDate current = range.fromDate(); !current.isAfter(range.toDate()); current = current.plusDays(1)) {
            usageByDate.put(current, zeroDaily(current));
        }

        for (TokenUsageDailyAggregate row : rows) {
            long totalTokens = safe(row.getTotalTokens());
            long extractTokens = safe(row.getExtractTokens());
            usageByDate.put(row.getUsageDate(), TokenUsageDailyResponse.builder()
                    .date(row.getUsageDate())
                    .chatTokens(safe(row.getChatTokens()))
                    .summaryTokens(safe(row.getSummaryTokens()))
                    .quizTokens(safe(row.getQuizTokens()))
                    .extractTokens(extractTokens)
                    .totalTokens(totalTokens)
                    .overallTokens(totalTokens + extractTokens)
                    .build());
        }

        List<TokenUsageDailyResponse> dailyUsage = usageByDate.values().stream().toList();
        TokenUsageTotalsResponse totals = buildTotals(dailyUsage);

        return TokenUsageReportResponse.builder()
                .scope(userId == null ? "ALL_USERS" : "SINGLE_USER")
                .userId(userId)
                .period(reportPeriod.name())
                .fromDate(range.fromDate())
                .toDate(range.toDate())
                .numberOfDays(ChronoUnit.DAYS.between(range.fromDate(), range.toDate()) + 1)
                .totals(totals)
                .dailyUsage(dailyUsage)
                .build();
    }

    private TokenUsageReportPeriod parsePeriod(String period) {
        if (period == null || period.isBlank()) {
            throw new BadRequestException("period is required. Allowed values: DAY, WEEK, MONTH, CUSTOM.");
        }
        try {
            return TokenUsageReportPeriod.valueOf(period.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid period. Allowed values: DAY, WEEK, MONTH, CUSTOM.");
        }
    }

    private DateRange resolveDateRange(
            TokenUsageReportPeriod period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        LocalDate baseDate = date != null ? date : LocalDate.now();
        return switch (period) {
            case DAY -> new DateRange(baseDate, baseDate);
            case WEEK -> new DateRange(
                    baseDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    baseDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
            );
            case MONTH -> new DateRange(
                    baseDate.withDayOfMonth(1),
                    baseDate.withDayOfMonth(baseDate.lengthOfMonth())
            );
            case CUSTOM -> {
                if (fromDate == null || toDate == null) {
                    throw new BadRequestException("fromDate and toDate are required when period=CUSTOM.");
                }
                if (fromDate.isAfter(toDate)) {
                    throw new BadRequestException("fromDate must be before or equal to toDate.");
                }
                yield new DateRange(fromDate, toDate);
            }
        };
    }

    private TokenUsageDailyResponse zeroDaily(LocalDate date) {
        return TokenUsageDailyResponse.builder()
                .date(date)
                .chatTokens(0L)
                .summaryTokens(0L)
                .quizTokens(0L)
                .extractTokens(0L)
                .totalTokens(0L)
                .overallTokens(0L)
                .build();
    }

    private TokenUsageTotalsResponse buildTotals(List<TokenUsageDailyResponse> dailyUsage) {
        long chatTokens = 0L;
        long summaryTokens = 0L;
        long quizTokens = 0L;
        long extractTokens = 0L;
        long totalTokens = 0L;

        for (TokenUsageDailyResponse daily : dailyUsage) {
            chatTokens += safe(daily.getChatTokens());
            summaryTokens += safe(daily.getSummaryTokens());
            quizTokens += safe(daily.getQuizTokens());
            extractTokens += safe(daily.getExtractTokens());
            totalTokens += safe(daily.getTotalTokens());
        }

        return TokenUsageTotalsResponse.builder()
                .chatTokens(chatTokens)
                .summaryTokens(summaryTokens)
                .quizTokens(quizTokens)
                .extractTokens(extractTokens)
                .totalTokens(totalTokens)
                .overallTokens(totalTokens + extractTokens)
                .build();
    }

    private long safe(Long value) {
        return value == null ? 0L : value;
    }

    private record DateRange(LocalDate fromDate, LocalDate toDate) {
    }
}
