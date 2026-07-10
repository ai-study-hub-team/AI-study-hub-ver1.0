package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserPlanUpdateRequest {

    @NotBlank(message = "planCode is required")
    private String planCode;
}
