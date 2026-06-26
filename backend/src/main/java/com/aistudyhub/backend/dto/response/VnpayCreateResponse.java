package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class VnpayCreateResponse {
    private String paymentUrl;
    private String orderCode;
}
