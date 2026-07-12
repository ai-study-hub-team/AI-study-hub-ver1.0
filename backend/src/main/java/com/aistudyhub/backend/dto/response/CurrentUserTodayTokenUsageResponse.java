package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CurrentUserTodayTokenUsageResponse {
    private Long total;
    private Long chat;
    private Long summarize;
    private Long quiz;
}
