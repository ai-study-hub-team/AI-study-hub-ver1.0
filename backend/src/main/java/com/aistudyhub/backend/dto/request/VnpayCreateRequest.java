package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VnpayCreateRequest {
    @NotBlank(message = "Plan code must not be blank")
    private String planCode;
}
