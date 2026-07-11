-- ============================================================
-- add_document_trash.sql
-- Idempotent migration: add trash-related columns to documents
-- Safe to run multiple times (uses IF NOT EXISTS guards).
-- ============================================================

-- 1. is_trashed: marks document as soft-moved to trash
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS is_trashed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. trashed_at: when the document was moved to trash
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMP NULL;

-- 3. delete_after: 30 days after trashed_at; scheduler uses this for auto-purge
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS delete_after TIMESTAMP NULL;

-- 4. trashed_by: user ID who moved it to trash (owner or admin)
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS trashed_by BIGINT NULL;

-- 5. Index on (is_trashed, delete_after) for efficient scheduler query
CREATE INDEX IF NOT EXISTS idx_documents_trash_expiry
    ON documents (is_trashed, delete_after)
    WHERE is_trashed = TRUE;

-- 6. Index on (user_id, is_trashed) for efficient trash list query
CREATE INDEX IF NOT EXISTS idx_documents_user_trash
    ON documents (user_id, is_trashed);
