package com.aistudyhub.backend.entity;

/**
 * Review status of a SharedDocumentSubmission (uploaded by User B).
 *
 * <ul>
 *   <li>{@code PENDING_REVIEW} – awaiting User A's decision. Staged file and quota are held.
 *   <li>{@code APPROVED} – User A approved; official Document has been created. Storage is
 *       reclassified from staged to official (total bytes unchanged).
 *   <li>{@code REJECTED} – User A rejected. File must be deleted and quota released after
 *       deletion succeeds. A {@code cleanupStatus} field tracks the deletion lifecycle.
 *   <li>{@code EXPIRED} – the 30-day PENDING_REVIEW window passed and the scheduler cleaned up
 *       the record. File deleted; quota released.
 * </ul>
 */
public enum SharedSubmissionStatus {
    PENDING_REVIEW,
    APPROVED,
    REJECTED,
    EXPIRED
}
