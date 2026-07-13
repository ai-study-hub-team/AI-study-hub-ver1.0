package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
public class AdminPlanRequest {
    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull
    @PositiveOrZero
    private Long storageLimitMb;

    @NotNull
    @PositiveOrZero
    private Long maxUploadSizePerFileMb;

    @NotNull
    @PositiveOrZero
    private Long dailyTokenLimit;

    @NotNull
    @PositiveOrZero
    private BigDecimal price;

    @PositiveOrZero
    private Integer durationDays;

    private String description;

    @NotNull
    private Boolean allowImageUpload;

    @NotNull
    private Boolean allowDocumentUpload;

    @NotNull
    private Boolean allowVideoUpload;

    @NotNull
    private Boolean allowAudioUpload;
    
    @NotNull
    private Boolean isActive;
}
