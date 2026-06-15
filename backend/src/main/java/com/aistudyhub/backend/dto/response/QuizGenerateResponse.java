package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.enums.QuizDifficulty;
import com.aistudyhub.backend.enums.QuizType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizGenerateResponse {
    private Long quizId;
    private Long documentId;
    private String documentTitle;
    private String title;
    private QuizDifficulty difficulty;
    private QuizType quizType;
    private Integer questionCount;
    private List<QuizQuestionResponse> questions;
    private LocalDateTime createdAt;
}
