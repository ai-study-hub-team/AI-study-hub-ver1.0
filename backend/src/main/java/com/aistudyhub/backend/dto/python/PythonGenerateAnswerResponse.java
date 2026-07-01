package com.aistudyhub.backend.dto.python;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

/**
 * Response from Python /generate-answer.
 * Python returns the Gemini-generated answer text and token usage.
 * Citations are derived from contextChunks in Spring Boot.
 *
 * <p>The {@code usage} field captures token counts from the answer-generation
 * Gemini call. It may be {@code null} if token extraction failed — Spring Boot
 * should treat null as zero tokens and log a warning.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonGenerateAnswerResponse {
    private String answer;
    /**
     * Token usage from the answer-generation Gemini call.
     * Null if Gemini call failed or token extraction failed.
     * Spring Boot should treat null as zero tokens.
     */
    private PythonTokenUsage usage;
}
