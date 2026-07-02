package com.aistudyhub.backend.dto.python;

import lombok.*;

import java.util.List;

/**
 * Request sent to Python /analyze-chat-query.
 * Gemini will analyze the user's intent and return a structured plan.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonAnalyzeChatQueryRequest {
    private String              question;
    private List<PythonMessage> history;
    private boolean             hasDocuments;
    private int                 documentCount;
}
