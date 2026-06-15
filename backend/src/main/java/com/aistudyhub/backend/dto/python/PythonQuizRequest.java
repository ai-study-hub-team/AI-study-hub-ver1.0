package com.aistudyhub.backend.dto.python;

import com.aistudyhub.backend.enums.QuizDifficulty;
import com.aistudyhub.backend.enums.QuizType;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonQuizRequest {
    private Long documentId;
    private String documentTitle;
    private Integer questionCount;
    private QuizDifficulty difficulty;
    private QuizType quizType;
    private Integer totalChunks;
    private Integer totalTextLength;
    private List<PythonQuizChunk> chunks;
}
