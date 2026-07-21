package com.aistudyhub.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenPricingResponse {
    private Long id;
    private String modelName;
    private BigDecimal inputPricePerMillion;
    private BigDecimal outputPricePerMillion;
    private String currency;
    private Boolean active;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
