package com.aistudyhub.backend.dto.python;

/**
 * Allowed retrieval strategies returned by Python /analyze-chat-query.
 */
public enum RetrievalStrategy {
    NONE,
    SEMANTIC_SEARCH,
    OVERVIEW_CONTEXT,
    MULTI_HOP_SEARCH,
    TOOL_CALL
}
