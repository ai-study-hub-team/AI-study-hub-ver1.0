ALTER TABLE shared_document_submissions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

CREATE INDEX IF NOT EXISTS idx_sds_owner_not_deleted
    ON shared_document_submissions (owner_user_id, submitted_at DESC)
    WHERE deleted_at IS NULL;
