package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
public class AdminRevenueDailyResponse {
    private LocalDate date;
    private BigDecimal totalRevenue;
    private long successfulTransactionCount;
}
