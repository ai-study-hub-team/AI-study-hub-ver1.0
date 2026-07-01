package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class PaymentStatusResponse {
    private String orderCode;
    private String status;
    private BigDecimal amount;
}
