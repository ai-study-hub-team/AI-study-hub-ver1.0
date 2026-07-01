package com.aistudyhub.backend.dto.python;

import lombok.*;

import java.util.List;

/**
 * Response payload returned by the Python AI service.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonChatResponse {
    private String answer;
    private List<PythonCitation> citations;
    private PythonTokenUsage usage;
}
