-- =============================================================================
-- Migration: Add Shared Upload Feature (Phase 2)
-- Project : AI Study Hub
-- Description:
--   A. Create the `document_share_links` table.
--   B. Create the `shared_document_submissions` table.
--   C. Add source/provenance columns to `documents`.
--
-- Note: Spring JPA ddl-auto=update will auto-create columns on startup.
--       This script is provided for reference and manual production execution.
-- =============================================================================

-- A. Create document_share_links table ---------------------------------------
CREATE TABLE IF NOT EXISTS document_share_links (
    id               BIGSERIAL     PRIMARY KEY,
    owner_user_id    BIGINT        NOT NULL,
    token_hash       VARCHAR(64)   NOT NULL UNIQUE,
    title            VARCHAR(255)  NULL,
    description      TEXT          NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    expires_at       TIMESTAMP     NULL,
    max_uploads      INTEGER       NULL,
    current_uploads  INTEGER       NOT NULL DEFAULT 0,
    default_folder_id BIGINT       NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dsl_owner
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_dsl_default_folder
        FOREIGN KEY (default_folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dsl_owner_user_id ON document_share_links(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_dsl_token_hash    ON document_share_links(token_hash);

-- B. Create shared_document_submissions table ---------------------------------
CREATE TABLE IF NOT EXISTS shared_document_submissions (
    id                   BIGSERIAL     PRIMARY KEY,
    share_link_id        BIGINT        NOT NULL,
    owner_user_id        BIGINT        NOT NULL,
    uploader_user_id     BIGINT        NULL,
    uploader_name        VARCHAR(255)  NULL,
    uploader_email       VARCHAR(254)  NULL,
    original_file_name   VARCHAR(255)  NULL,
    stored_file_path     VARCHAR(500)  NULL,
    stored_file_name     VARCHAR(255)  NULL,
    file_type            VARCHAR(255)  NULL,
    file_size            BIGINT        NULL,
    title                VARCHAR(255)  NULL,
    description          TEXT          NULL,
    status               VARCHAR(20)   NOT NULL DEFAULT 'PENDING_REVIEW',
    approved_document_id BIGINT        NULL,
    submitted_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at          TIMESTAMP     NULL,
    reviewed_by          BIGINT        NULL,
    reject_reason        TEXT          NULL,

    CONSTRAINT fk_sds_share_link
        FOREIGN KEY (share_link_id) REFERENCES document_share_links(id) ON DELETE CASCADE,

    CONSTRAINT fk_sds_owner
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_sds_approved_doc
        FOREIGN KEY (approved_document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sds_owner_user_id   ON shared_document_submissions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sds_share_link_id   ON shared_document_submissions(share_link_id);
CREATE INDEX IF NOT EXISTS idx_sds_status           ON shared_document_submissions(status);

-- C. Add provenance columns to documents ---------------------------------------
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS source_type            VARCHAR(30)  NOT NULL DEFAULT 'DIRECT_UPLOAD',
    ADD COLUMN IF NOT EXISTS source_submission_id   BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS contributed_by_user_id BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS contributed_by_name    VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS contributed_by_email   VARCHAR(254) NULL;

-- =============================================================================
-- Summary of new columns on `documents`:
--   source_type             TEXT 'DIRECT_UPLOAD' | 'SHARED_UPLOAD'
--   source_submission_id    BIGINT — FK to shared_document_submissions (soft ref)
--   contributed_by_user_id  BIGINT — User B's ID if authenticated
--   contributed_by_name     TEXT   — Name provided by User B
--   contributed_by_email    TEXT   — Email provided by User B
-- =============================================================================
