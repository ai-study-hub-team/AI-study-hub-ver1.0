package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VnpayReturnResult {
    private String orderCode;
    private String status;
    private boolean success;
    private String message;
}
