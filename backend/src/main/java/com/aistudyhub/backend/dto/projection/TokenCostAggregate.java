package com.aistudyhub.backend.dto.projection;

import java.math.BigDecimal;

public interface TokenCostAggregate {
    Long getInputToken();
    Long getOutputToken();
    BigDecimal getInputCost();
    BigDecimal getOutputCost();
    BigDecimal getTotalCost();
}
