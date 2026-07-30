package com.aistudyhub.backend.dto.request;

import com.aistudyhub.backend.enums.QuizDifficulty;
import com.aistudyhub.backend.enums.QuizType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizGenerateRequest {

    @NotNull(message = "documentId is required")
    private Long documentId;

    // null → default 5 in service
    private Integer questionCount;

    // null → default MEDIUM in service
    private QuizDifficulty difficulty;

    // null → default MULTIPLE_CHOICE in service
    private QuizType quizType;
}
