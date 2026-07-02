-- =============================================================================
-- Migration: Add Folder Feature (Phase 1)
-- Project : AI Study Hub
-- Description:
--   1. Create the `folders` table (user-owned, self-referencing parent).
--   2. Add `folder_id` column to `documents` table with a FK to `folders`.
--
-- Note: This project uses spring.jpa.hibernate.ddl-auto=update, so JPA will
--       auto-create/update columns on startup. This script is provided for
--       reference and for manual execution if needed (e.g. production DB).
--
-- Run order: execute on the PostgreSQL instance before starting the application.
-- =============================================================================

-- 1. Create folders table -------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT        NOT NULL,
    parent_folder_id BIGINT        NULL,
    name             VARCHAR(255)  NOT NULL,
    description      TEXT          NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_folders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_folders_parent
        FOREIGN KEY (parent_folder_id)
        REFERENCES folders(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id          ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder_id ON folders(parent_folder_id);

-- 2. Add folder_id column to documents -------------------------------------
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS folder_id BIGINT NULL;

ALTER TABLE documents
    DROP CONSTRAINT IF EXISTS fk_documents_folder;

ALTER TABLE documents
    ADD CONSTRAINT fk_documents_folder
    FOREIGN KEY (folder_id)
    REFERENCES folders(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);

-- =============================================================================
-- Notes:
--   - folder_id = NULL  →  document is at root (no folder).
--   - folder_id = N     →  document belongs to folder N.
--   - ON DELETE SET NULL on fk_documents_folder ensures that when a folder is
--     deleted, its documents are automatically moved back to root.
--   - ON DELETE SET NULL on fk_folders_parent ensures child folders become
--     root-level folders when their parent is deleted.
--   - ON DELETE CASCADE on fk_folders_user cleans up all folders when a user
--     is deleted.
-- =============================================================================
