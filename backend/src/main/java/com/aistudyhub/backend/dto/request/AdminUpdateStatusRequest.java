package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUpdateStatusRequest {

    @NotNull(message = "status is required")
    private UserStatus status;
}
