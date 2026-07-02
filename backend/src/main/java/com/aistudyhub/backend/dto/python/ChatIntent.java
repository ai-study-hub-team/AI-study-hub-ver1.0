package com.aistudyhub.backend.dto.python;

/**
 * Allowed chat intents returned by Python /analyze-chat-query.
 */
public enum ChatIntent {
    GENERAL_CHAT,
    DOCUMENT_QA,
    FOLLOW_UP_QA,
    DOCUMENT_OVERVIEW,
    COMPARISON,
    TOOL_SUMMARY,
    TOOL_QUIZ,
    META_CHAT,
    OUT_OF_SCOPE
}
