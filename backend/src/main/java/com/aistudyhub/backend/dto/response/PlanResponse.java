package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class PlanResponse {
    private Long id;
    private String code;
    private String name;
    private Long storageLimitMb;
    private Long maxUploadSizePerFileMb;
    private Long dailyTokenLimit;
    private BigDecimal price;
    private Integer durationDays;
    private String description;
    private Boolean allowImageUpload;
    private Boolean allowDocumentUpload;
    private Boolean allowVideoUpload;
    private Boolean allowAudioUpload;
    private Boolean isActive;
}
