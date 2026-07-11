package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
public class AdminRevenueResponse {
    private BigDecimal totalRevenue;
    private long successfulTransactionCount;
    private String currency;
    private String period;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long numberOfDays;
    private List<AdminRevenueDailyResponse> dailyRevenue;
}
