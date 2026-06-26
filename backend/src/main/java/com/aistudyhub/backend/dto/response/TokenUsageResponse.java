package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class TokenUsageResponse {
    private Long dailyLimit;
    private Long usedToday;
    private Long remaining;
}
