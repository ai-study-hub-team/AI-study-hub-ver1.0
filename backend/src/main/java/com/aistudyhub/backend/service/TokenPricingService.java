package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.projection.TokenCostAggregate;
import com.aistudyhub.backend.dto.request.TokenPricingUpdateRequest;
import com.aistudyhub.backend.dto.response.TokenCostResponse;
import com.aistudyhub.backend.dto.response.TokenPricingResponse;
import com.aistudyhub.backend.entity.TokenPricing;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.enums.TokenUsageReportPeriod;
import com.aistudyhub.backend.exception.BadRequestException;
import com.aistudyhub.backend.exception.NotFoundException;
import com.aistudyhub.backend.repository.TokenPricingRepository;
import com.aistudyhub.backend.repository.UserDailyUsageRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TokenPricingService {

    private static final String DEFAULT_MODEL_NAME = "Gemini 3.1 Flash-Lite";
    private static final BigDecimal DEFAULT_INPUT_PRICE_PER_MILLION = new BigDecimal("0.25");
    private static final BigDecimal DEFAULT_OUTPUT_PRICE_PER_MILLION = new BigDecimal("1.50");
    private static final String DEFAULT_CURRENCY = "USD";
    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");
    private final TokenPricingRepository tokenPricingRepository;
    private final UserDailyUsageRepository userDailyUsageRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final RolePolicyService rolePolicyService;

    @Transactional
    public TokenPricingResponse getCurrentPricing() {
        User currentUser = currentUserService.getCurrentUser();
        rolePolicyService.requireAdmin(currentUser, "Only administrators can view token pricing");
        return toResponse(getOrCreateActivePricing(null));
    }

    @Transactional
    public String getActiveModelNameForUsage() {
        return getOrCreateActivePricing(null).getModelName();
    }

    @Transactional
    public TokenPricingResponse updatePricing(TokenPricingUpdateRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        rolePolicyService.requireAdmin(currentUser, "Only administrators can update token pricing");

        TokenPricing pricing = getOrCreateActivePricing(currentUser.getId());
        pricing.setModelName(request.getModelName().trim());
        pricing.setInputPricePerMillion(request.getInputPricePerMillion());
        pricing.setOutputPricePerMillion(request.getOutputPricePerMillion());
        pricing.setCurrency(resolveCurrency(request.getCurrency()));
        pricing.setActive(true);
        pricing.setUpdatedBy(currentUser.getId());

        return toResponse(tokenPricingRepository.save(pricing));
    }

    @Transactional
    public TokenCostResponse getSystemCost(
            Long userId,
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate) {
        User currentUser = currentUserService.getCurrentUser();
        rolePolicyService.requireAdmin(currentUser, "Only administrators can view token cost");

        if (userId != null && !userRepository.existsById(userId)) {
            throw new NotFoundException("User not found with id: " + userId);
        }

        TokenUsageReportPeriod reportPeriod = parsePeriod(period);
        CostDateRange range = resolveDateRange(reportPeriod, date, fromDate, toDate);
        TokenPricing pricing = getOrCreateActivePricing(null);
        TokenCostAggregate aggregate = userId == null
                ? userDailyUsageRepository.sumTokenCostByDateRange(range.fromDate(), range.toDate())
                : userDailyUsageRepository.sumTokenCostByUserIdAndDateRange(userId, range.fromDate(), range.toDate());

        long inputToken = aggregate == null || aggregate.getInputToken() == null ? 0L : aggregate.getInputToken();
        long outputToken = aggregate == null || aggregate.getOutputToken() == null ? 0L : aggregate.getOutputToken();

        BigDecimal inputCost = calculateCost(inputToken, pricing.getInputPricePerMillion());
        BigDecimal outputCost = calculateCost(outputToken, pricing.getOutputPricePerMillion());

        return TokenCostResponse.builder()
                .scope(userId == null ? "ALL_USERS" : "SINGLE_USER")
                .userId(userId)
                .period(reportPeriod.name())
                .modelName(pricing.getModelName())
                .currency(pricing.getCurrency())
                .fromDate(range.fromDate())
                .toDate(range.toDate())
                .numberOfDays(ChronoUnit.DAYS.between(range.fromDate(), range.toDate()) + 1)
                .totalInputToken(inputToken)
                .totalOutputToken(outputToken)
                .inputPricePerMillion(pricing.getInputPricePerMillion())
                .outputPricePerMillion(pricing.getOutputPricePerMillion())
                .inputCost(inputCost)
                .outputCost(outputCost)
                .totalCost(inputCost.add(outputCost))
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

    private CostDateRange resolveDateRange(
            TokenUsageReportPeriod period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        LocalDate baseDate = date != null ? date : LocalDate.now();
        return switch (period) {
            case DAY -> new CostDateRange(baseDate, baseDate);
            case WEEK -> new CostDateRange(
                    baseDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    baseDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
            );
            case MONTH -> new CostDateRange(
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
                yield new CostDateRange(fromDate, toDate);
            }
        };
    }

    private TokenPricing getOrCreateActivePricing(Long updatedBy) {
        return tokenPricingRepository.findFirstByActiveTrueOrderByUpdatedAtDesc()
                .orElseGet(() -> tokenPricingRepository.save(TokenPricing.builder()
                        .modelName(DEFAULT_MODEL_NAME)
                        .inputPricePerMillion(DEFAULT_INPUT_PRICE_PER_MILLION)
                        .outputPricePerMillion(DEFAULT_OUTPUT_PRICE_PER_MILLION)
                        .currency(DEFAULT_CURRENCY)
                        .active(true)
                        .updatedBy(updatedBy)
                        .build()));
    }

    private BigDecimal calculateCost(long tokens, BigDecimal pricePerMillion) {
        return BigDecimal.valueOf(tokens)
                .multiply(pricePerMillion)
                .divide(ONE_MILLION, 12, RoundingMode.HALF_UP);
    }

    private String resolveCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return DEFAULT_CURRENCY;
        }
        return currency.trim().toUpperCase();
    }

    private TokenPricingResponse toResponse(TokenPricing pricing) {
        return TokenPricingResponse.builder()
                .id(pricing.getId())
                .modelName(pricing.getModelName())
                .inputPricePerMillion(pricing.getInputPricePerMillion())
                .outputPricePerMillion(pricing.getOutputPricePerMillion())
                .currency(pricing.getCurrency())
                .active(pricing.getActive())
                .updatedBy(pricing.getUpdatedBy())
                .updatedAt(pricing.getUpdatedAt())
                .build();
    }

    private record CostDateRange(LocalDate fromDate, LocalDate toDate) {
    }
}
