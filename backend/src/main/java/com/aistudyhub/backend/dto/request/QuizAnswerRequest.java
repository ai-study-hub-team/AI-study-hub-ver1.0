package com.aistudyhub.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuizAnswerRequest {

    @NotNull(message = "questionId is required")
    private Long questionId;

    @NotNull(message = "selectedOptionId is required")
    private Long selectedOptionId;
}
