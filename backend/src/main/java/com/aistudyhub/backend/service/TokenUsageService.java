package com.aistudyhub.backend.service;

import com.aistudyhub.backend.entity.TokenUsageLog;
import com.aistudyhub.backend.entity.User;
import com.aistudyhub.backend.entity.UserDailyUsage;
import com.aistudyhub.backend.entity.UserSubscription;
import com.aistudyhub.backend.exception.QuotaExceededException;
import com.aistudyhub.backend.repository.TokenUsageLogRepository;
import com.aistudyhub.backend.repository.UserDailyUsageRepository;
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

    @Transactional(readOnly = true)
    public void validateTokenQuota(Long userId) {
        UserSubscription subscription = subscriptionService.getCurrentSubscription(userId);
        Long dailyLimit = subscription.getPlan().getDailyTokenLimit();

        UserDailyUsage usage = userDailyUsageRepository.findByUserIdAndUsageDate(userId, LocalDate.now())
                .orElse(null);

        if (usage != null && usage.getTotalTokens() >= dailyLimit) {
            throw new QuotaExceededException("Daily token quota exceeded. Please upgrade your plan or try again tomorrow.");
        }
    }

    @Transactional
    public void recordUsage(User user, String featureType, String modelName, Long tokens, Long documentId, String requestId) {
        if (tokens == null || tokens <= 0) {
            return;
        }

        // 1. Log detailed usage
        TokenUsageLog logEntry = TokenUsageLog.builder()
                .user(user)
                .featureType(featureType)
                .modelName(modelName)
                .tokens(tokens)
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
                        .totalTokens(0L)
                        .build());

        usage.setTotalTokens(usage.getTotalTokens() + tokens);

        switch (featureType.toUpperCase()) {
            case "CHAT":
                usage.setChatTokens(usage.getChatTokens() + tokens);
                break;
            case "SUMMARY":
                usage.setSummaryTokens(usage.getSummaryTokens() + tokens);
                break;
            case "QUIZ":
                usage.setQuizTokens(usage.getQuizTokens() + tokens);
                break;
            default:
                log.warn("Unknown feature type for token usage: {}", featureType);
        }

        userDailyUsageRepository.save(usage);
    }
}
