package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class TokenPricingUpdateRequest {

    @NotBlank(message = "Model name is required")
    private String modelName;

    @NotNull(message = "Input price is required")
    @PositiveOrZero(message = "Input price must be greater than or equal to 0")
    private BigDecimal inputPricePerMillion;

    @NotNull(message = "Output price is required")
    @PositiveOrZero(message = "Output price must be greater than or equal to 0")
    private BigDecimal outputPricePerMillion;

    private String currency;
}
