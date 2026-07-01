-- V003__add_shared_upload_document_metadata.sql
-- Purpose:
-- Add source/contributor metadata columns to the documents table for Shared Upload approval flow.
-- This fixes errors like:
--   ERROR: column "source_type" of relation "documents" does not exist
--
-- Put this file in:
--   backend/src/main/resources/db/migration/
--
-- PostgreSQL / Flyway compatible. Safe to run more than once because columns are added with IF NOT EXISTS.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_submission_id BIGINT,
    ADD COLUMN IF NOT EXISTS contributed_by_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS contributed_by_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contributed_by_email VARCHAR(320);

-- Existing documents were uploaded directly, so mark old rows as DIRECT_UPLOAD.
UPDATE documents
SET source_type = 'DIRECT_UPLOAD'
WHERE source_type IS NULL;

-- New direct-upload documents should default to DIRECT_UPLOAD when the app does not explicitly set source_type.
ALTER TABLE documents
    ALTER COLUMN source_type SET DEFAULT 'DIRECT_UPLOAD';

-- Keep source_type required after old rows have been backfilled.
ALTER TABLE documents
    ALTER COLUMN source_type SET NOT NULL;

-- Helpful indexes for filtering/auditing shared-upload documents.
CREATE INDEX IF NOT EXISTS idx_documents_source_type
    ON documents (source_type);

CREATE INDEX IF NOT EXISTS idx_documents_source_submission_id
    ON documents (source_submission_id);

CREATE INDEX IF NOT EXISTS idx_documents_contributed_by_user_id
    ON documents (contributed_by_user_id);

-- Optional foreign key to shared_document_submissions(id).
-- This block only creates the FK if the shared_document_submissions table exists.
-- It avoids breaking migration order on another machine.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'shared_document_submissions'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_documents_source_submission'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT fk_documents_source_submission
            FOREIGN KEY (source_submission_id)
            REFERENCES shared_document_submissions(id)
            ON DELETE SET NULL;
    END IF;
END $$;
