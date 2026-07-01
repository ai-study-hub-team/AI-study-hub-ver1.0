package com.aistudyhub.backend.dto.python;

import lombok.*;

/**
 * Response from Python /generate-answer.
 * Python returns only the Gemini-generated answer text.
 * Citations are derived from contextChunks in Spring Boot.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonGenerateAnswerResponse {
    private String answer;
}
