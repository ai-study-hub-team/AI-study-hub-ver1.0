package com.aistudyhub.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenUsageDailyResponse {
    private LocalDate date;
    private Long chatTokens;
    private Long summaryTokens;
    private Long quizTokens;
    private Long extractTokens;
    private Long totalTokens;
    private Long overallTokens;
}
