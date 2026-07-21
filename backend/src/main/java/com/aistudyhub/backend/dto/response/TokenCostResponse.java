package com.aistudyhub.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenCostResponse {
    private String scope;
    private Long userId;
    private String period;
    private String modelName;
    private String currency;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long numberOfDays;
    private Long totalInputToken;
    private Long totalOutputToken;
    private BigDecimal inputPricePerMillion;
    private BigDecimal outputPricePerMillion;
    private BigDecimal inputCost;
    private BigDecimal outputCost;
    private BigDecimal totalCost;
}
