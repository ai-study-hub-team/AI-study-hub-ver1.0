package com.aistudyhub.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenUsageReportResponse {
    private String scope;
    private Long userId;
    private String period;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long numberOfDays;
    private TokenUsageTotalsResponse totals;
    private List<TokenUsageDailyResponse> dailyUsage;
}
