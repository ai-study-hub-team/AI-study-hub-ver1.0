package com.aistudyhub.backend.dto.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface AdminRevenueDailyAggregate {
    LocalDate getRevenueDate();

    BigDecimal getTotalRevenue();

    Long getSuccessfulTransactionCount();
}
