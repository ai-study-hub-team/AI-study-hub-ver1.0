package com.aistudyhub.backend.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionResponse {
    private Long questionId;
    private String questionText;
    private Integer questionOrder;
    private String explanation;
    private List<QuizOptionResponse> options;
}
