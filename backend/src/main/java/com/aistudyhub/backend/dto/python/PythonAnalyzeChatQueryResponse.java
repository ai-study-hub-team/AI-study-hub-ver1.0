package com.aistudyhub.backend.dto.python;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.util.List;

/**
 * Response from Python /analyze-chat-query (Chat Planner).
 * Fields map directly from the Gemini-generated JSON plan.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonAnalyzeChatQueryResponse {
    /** Resolved intent as a string (mapped to ChatIntent enum in service). */
    private String       intent;
    /** Rewritten/expanded question for better semantic retrieval. */
    private String       rewrittenQuestion;
    /** How to retrieve context (mapped to RetrievalStrategy enum). */
    private String       retrievalStrategy;
    /** One or more search queries to run (used for MULTI_HOP_SEARCH). */
    private List<String> searchQueries;
    /** Whether a vector retrieval step is needed at all. */
    private boolean      needsRetrieval;
    /** Planner's confidence score (0.0–1.0). */
    private double       confidence;
}
