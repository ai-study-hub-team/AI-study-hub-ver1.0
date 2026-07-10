-- ============================================================
-- add_shared_submission_expiry.sql
-- Idempotent migration: add delete_after column and index
-- to shared_document_submissions for 30-day pending cleanup.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ============================================================

-- 1. delete_after: deadline for auto-removal if still PENDING_REVIEW
ALTER TABLE shared_document_submissions
    ADD COLUMN IF NOT EXISTS delete_after TIMESTAMP NULL;

-- 2. Partial index for efficient scheduler query:
--    only rows where status = 'PENDING_REVIEW' are indexed.
CREATE INDEX IF NOT EXISTS idx_shared_submissions_pending_expiry
    ON shared_document_submissions (status, delete_after)
    WHERE status = 'PENDING_REVIEW';
