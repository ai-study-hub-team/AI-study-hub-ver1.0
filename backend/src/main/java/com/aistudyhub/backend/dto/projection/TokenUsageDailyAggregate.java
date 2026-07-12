package com.aistudyhub.backend.dto.projection;

import java.time.LocalDate;

public interface TokenUsageDailyAggregate {
    LocalDate getUsageDate();
    Long getChatTokens();
    Long getSummaryTokens();
    Long getQuizTokens();
    Long getExtractTokens();
    Long getTotalTokens();
    Long getOverallTokens();
}
