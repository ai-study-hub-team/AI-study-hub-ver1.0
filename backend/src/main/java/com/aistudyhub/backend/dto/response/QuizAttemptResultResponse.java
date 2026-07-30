package com.aistudyhub.backend.dto.response;

import com.aistudyhub.backend.enums.QuizAttemptStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class QuizAttemptResultResponse {
    private Long attemptId;
    private Long quizId;
    private QuizAttemptStatus status;
    private Integer correctCount;
    private Integer totalQuestions;
    private BigDecimal score;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private List<QuizAnswerResultResponse> answers;
}
