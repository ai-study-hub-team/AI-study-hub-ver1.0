package com.aistudyhub.backend.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuizAnswerResultResponse {
    private Long questionId;
    private Long selectedOptionId;
    private Long correctOptionId;
    private Boolean correct;
    private String explanation;
}
