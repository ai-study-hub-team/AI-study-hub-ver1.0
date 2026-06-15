package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserStatusUpdateRequest {

    @NotBlank(message = "Status must not be blank")
    private String status;
}
