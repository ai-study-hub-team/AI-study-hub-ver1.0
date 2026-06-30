package com.aistudyhub.backend.entity;

/**
 * Review status of a SharedDocumentSubmission (uploaded by User B).
 * PENDING_REVIEW = waiting for User A to act.
 * APPROVED       = User A approved → official Document created.
 * REJECTED       = User A rejected → no Document created.
 */
public enum SharedSubmissionStatus {
    PENDING_REVIEW,
    APPROVED,
    REJECTED
}
