package com.aistudyhub.backend.dto.python;

import lombok.*;

import java.util.List;

/**
 * Request payload sent to Python /generate-answer.
 * Spring Boot has already performed semantic search and resolved chunk text.
 * Python should only build the Gemini prompt and return the answer.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonGenerateAnswerRequest {
    private String                   question;
    /** Planner-rewritten question used for retrieval (may differ from question). */
    private String                   rewrittenQuestion;
    /** Planner-resolved intent string (e.g. "GENERAL_CHAT", "DOCUMENT_QA"). */
    private String                   intent;
    private List<PythonMessage>      history;
    private List<PythonContextChunk> contextChunks;
    /** True if documents are attached to the session. Affects prompt behaviour. */
    private boolean                  hasDocuments;
}
