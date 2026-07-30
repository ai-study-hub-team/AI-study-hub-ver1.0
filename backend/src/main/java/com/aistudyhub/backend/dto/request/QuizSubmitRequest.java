package com.aistudyhub.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class QuizSubmitRequest {

    @NotNull(message = "answers is required")
    private List<@Valid QuizAnswerRequest> answers;
}
