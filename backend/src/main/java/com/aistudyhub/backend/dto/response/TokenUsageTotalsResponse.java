package com.aistudyhub.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenUsageTotalsResponse {
    private Long chatTokens;
    private Long summaryTokens;
    private Long quizTokens;
    private Long extractTokens;
    private Long totalTokens;
    private Long overallTokens;
}
