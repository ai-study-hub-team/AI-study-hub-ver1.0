package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class SubscriptionResponse {
    private PlanResponse plan;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
}
