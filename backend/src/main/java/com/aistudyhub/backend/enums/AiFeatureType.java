package com.aistudyhub.backend.enums;

/**
 * AI features tracked in the usage analytics system.
 * Maps directly to the {@code feature_type} column in {@code ai_usage_events}.
 */
public enum AiFeatureType {
    CHAT,
    QUIZ,
    SUMMARY
}
