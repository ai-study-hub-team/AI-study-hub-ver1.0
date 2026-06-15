package com.aistudyhub.backend.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizOptionResponse {
    private Long optionId;
    private String optionText;
    private Boolean isCorrect;
    private Integer optionOrder;
}
