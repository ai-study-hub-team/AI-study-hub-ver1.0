package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PaymentHistoryResponse {
    private String orderCode;
    private BigDecimal amount;
    private String provider;
    private String status;
    private String transactionNo;
    private LocalDateTime paymentTime;
    private String failureReason;
    
    // Snapshot fields
    private String planCode;
    private String planName;
    private BigDecimal planPrice;
    private Integer purchasedDays;
    
    private LocalDateTime createdAt;
}
