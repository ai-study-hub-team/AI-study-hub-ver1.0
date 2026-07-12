package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VnpayPaymentCreation {
    private String paymentUrl;
    private String orderCode;
}
