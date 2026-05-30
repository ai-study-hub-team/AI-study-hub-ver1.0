package com.aistudyhub.backend.entity;

/**
 * Represents the lifecycle status of a Document.
 * ACTIVE  - The document is visible and usable.
 * DELETED - The document has been soft-deleted (hidden but kept in the database).
 */
public enum DocumentStatus {
    ACTIVE,
    DELETED
}
