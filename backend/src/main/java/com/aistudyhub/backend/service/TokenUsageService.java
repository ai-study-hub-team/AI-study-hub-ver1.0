package com.aistudyhub.backend.service;

import com.aistudyhub.backend.dto.response.CurrentUserTodayTokenUsageResponse;
import com.aistudyhub.backend.entity.TokenUsageLog;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserDailyUsage;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.exception.QuotaExceededException;
import com.aistudyhub.backend.repository.TokenUsageLogRepository;
import com.aistudyhub.backend.repository.UserDailyUsageRepository;
import com.aistudyhub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenUsageService {

    private final SubscriptionService subscriptionService;
    private final UserDailyUsageRepository userDailyUsageRepository;
    private final TokenUsageLogRepository tokenUsageLogRepository;
    private final UserRepository userRepository;
    private final RolePolicyService rolePolicyService;

    @Transactional(readOnly = true)
    public CurrentUserTodayTokenUsageResponse getTodayUsage(Long userId) {
        UserDailyUsage usage = userDailyUsageRepository
                .findByUserIdAndUsageDate(userId, LocalDate.now())
                .orElse(null);

        if (usage == null) {
            return CurrentUserTodayTokenUsageResponse.builder()
                    .total(0L)
                    .chat(0L)
                    .summarize(0L)
                    .quiz(0L)
                    .build();
        }

        return CurrentUserTodayTokenUsageResponse.builder()
                .total(safe(usage.getTotalTokens()))
                .chat(safe(usage.getChatTokens()))
                .summarize(safe(usage.getSummaryTokens()))
                .quiz(safe(usage.getQuizTokens()))
                .build();
    }

    @Transactional(readOnly = true)
    // so sánh token hằng ngày
    public void validateTokenQuota(Long userId, String featureType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (rolePolicyService.isManagementAccount(user)) {
            log.info("[TokenQuota][{}] bypass for management account userId={}, role={}",
                    featureType, user.getId(), user.getRole());
            return;
        }

        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);
        Long dailyLimit = subscription.getPlan().getDailyTokenLimit();

        LocalDate today = LocalDate.now();

        UserDailyUsage usage = userDailyUsageRepository.findByUserIdAndUsageDate(userId, today)
                .orElse(null);

        long used = (usage != null) ? safe(usage.getTotalTokens()) : 0L;

        log.info("[TokenQuota][{}] userId={}, date={}, used={}, limit={}",
                featureType, userId, today, used, dailyLimit);

        if (used >= dailyLimit) {
            throw new QuotaExceededException("Daily token quota exceeded. Please upgrade your plan or try again tomorrow.");
        }
    }

    @Transactional
    // ghi lại lịch sử token và tỏngo token
    public void recordUsage(User user, String featureType, String modelName, Long tokens, Long documentId, String requestId) {
        recordUsage(user, featureType, modelName, 0L, 0L, tokens, documentId, requestId);
    }

    @Transactional
    public void recordUsage(
            User user,
            String featureType,
            String modelName,
            Long inputToken,
            Long outputToken,
            Long tokens,
            Long documentId,
            String requestId
    ) {
        long safeInputToken = safe(inputToken);
        long safeOutputToken = safe(outputToken);
        long safeTokens = safe(tokens);
        long resolvedTokens = safeTokens > 0 ? safeTokens : safeInputToken + safeOutputToken;

        if (resolvedTokens <= 0 && safeInputToken <= 0 && safeOutputToken <= 0) {
            return;
        }
        if (requestId != null && !requestId.isBlank() && tokenUsageLogRepository.existsByRequestId(requestId)) {
            log.warn("[TokenUsage][{}] duplicate requestId={} ignored for userId={}",
                    featureType, requestId, user.getId());
            return;
        }

        // 1. Log detailed usage
        TokenUsageLog logEntry = TokenUsageLog.builder()
                .user(user)
                .featureType(featureType)
                .modelName(modelName)
                .tokens(resolvedTokens)
                .documentId(documentId)
                .requestId(requestId)
                .build();
        tokenUsageLogRepository.save(logEntry);

        // 2. Update daily aggregate
        UserDailyUsage usage = userDailyUsageRepository.findByUserIdAndUsageDate(user.getId(), LocalDate.now())
                .orElse(UserDailyUsage.builder()
                        .user(user)
                        .usageDate(LocalDate.now())
                        .chatTokens(0L)
                        .summaryTokens(0L)
                        .quizTokens(0L)
                        .extractTokens(0L)
                        .totalTokens(0L)
                        .inputToken(0L)
                        .outputToken(0L)
                        .overallTokens(0L)
                        .build());

        switch (featureType.toUpperCase()) {
            case "CHAT":
                usage.setChatTokens(safe(usage.getChatTokens()) + resolvedTokens);
                usage.setTotalTokens(safe(usage.getTotalTokens()) + resolvedTokens);
                break;
            case "SUMMARY":
                usage.setSummaryTokens(safe(usage.getSummaryTokens()) + resolvedTokens);
                usage.setTotalTokens(safe(usage.getTotalTokens()) + resolvedTokens);
                break;
            case "QUIZ":
                usage.setQuizTokens(safe(usage.getQuizTokens()) + resolvedTokens);
                usage.setTotalTokens(safe(usage.getTotalTokens()) + resolvedTokens);
                break;
            case "EXTRACT":
                usage.setExtractTokens(safe(usage.getExtractTokens()) + resolvedTokens);
                break;
            default:
                log.warn("Unknown feature type for token usage: {}", featureType);
        }

        usage.setInputToken(safe(usage.getInputToken()) + safeInputToken);
        usage.setOutputToken(safe(usage.getOutputToken()) + safeOutputToken);
        usage.setOverallTokens(safe(usage.getTotalTokens()) + safe(usage.getExtractTokens()));

        userDailyUsageRepository.save(usage);
        log.info("[TokenUsage][{}] recorded tokens={}, inputToken={}, outputToken={}, userId={}",
                featureType, resolvedTokens, safeInputToken, safeOutputToken, user.getId());
    }

    private long safe(Long value) {
        return value == null ? 0L : value;
    }
}
