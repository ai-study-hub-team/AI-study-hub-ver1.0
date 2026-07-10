package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.enums.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUpdateRoleRequest {

    @NotNull(message = "role is required")
    private UserRole role;
}
