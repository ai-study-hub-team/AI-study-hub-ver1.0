-- =============================================================================
-- Migration: V007 — Shared Upload Security Overhaul
-- Project : AI Study Hub
-- Date    : 2026-07-21
--
-- EXECUTION STATUS: MANUAL — This script is NOT automatically executed.
--   Hibernate ddl-auto=update handles new entity columns on startup.
--   This script adds indexes, constraints, the allowlist table, and
--   backfill statements that Hibernate cannot perform safely.
--
-- RUN ORDER: Execute this script AFTER deploying the updated backend JAR.
--   The JAR startup will have already added the new columns via ddl-auto.
--   Running this before the JAR may cause constraint errors on empty columns.
--
-- IDEMPOTENT: All statements use IF NOT EXISTS / DO NOTHING patterns.
-- =============================================================================

-- ─── 1. New table: document_share_link_allowed_users ──────────────────────────
--   Created by Hibernate on startup if it does not exist.
--   This script adds the unique constraint and indexes explicitly.

CREATE TABLE IF NOT EXISTS document_share_link_allowed_users (
    id                  BIGSERIAL   PRIMARY KEY,
    share_link_id       BIGINT      NOT NULL,
    allowed_user_id     BIGINT      NOT NULL,
    granted_by_user_id  BIGINT      NOT NULL,
    created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dslau_link
        FOREIGN KEY (share_link_id)
            REFERENCES document_share_links(id) ON DELETE CASCADE,

    CONSTRAINT fk_dslau_allowed_user
        FOREIGN KEY (allowed_user_id)
            REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT uk_dslau_link_user
        UNIQUE (share_link_id, allowed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dslau_link_id ON document_share_link_allowed_users(share_link_id);
CREATE INDEX IF NOT EXISTS idx_dslau_user_id ON document_share_link_allowed_users(allowed_user_id);


-- ─── 2. New columns on document_share_links ───────────────────────────────────
--   Hibernate adds these on startup. This script sets the correct default and
--   backfills existing rows.

-- access_policy: default PRIVATE_ALLOWLIST for all existing and future links
ALTER TABLE document_share_links
    ADD COLUMN IF NOT EXISTS access_policy          VARCHAR(30)  NOT NULL DEFAULT 'PRIVATE_ALLOWLIST',
    ADD COLUMN IF NOT EXISTS max_uploads_per_user   INTEGER      NULL,
    ADD COLUMN IF NOT EXISTS max_total_bytes        BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS max_file_size_bytes    BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS allowed_file_types     VARCHAR(1000) NULL,
    ADD COLUMN IF NOT EXISTS active_stored_bytes    BIGINT       NOT NULL DEFAULT 0;

-- Backfill: all existing links get the most restrictive policy (PRIVATE_ALLOWLIST).
-- This means they will deny all uploads until the owner explicitly grants access.
-- This is intentional — fail closed.
UPDATE document_share_links
SET access_policy = 'PRIVATE_ALLOWLIST'
WHERE access_policy IS NULL OR access_policy = '';

CREATE INDEX IF NOT EXISTS idx_dsl_access_policy ON document_share_links(access_policy);


-- ─── 3. New columns on shared_document_submissions ───────────────────────────
--   Hibernate adds these on startup. Backfill statements follow.

ALTER TABLE shared_document_submissions
    -- Cloudinary object metadata for direct shared uploads
    ADD COLUMN IF NOT EXISTS cloud_public_id      VARCHAR(500)  NULL,
    ADD COLUMN IF NOT EXISTS cloud_secure_url     VARCHAR(1000) NULL,
    ADD COLUMN IF NOT EXISTS cloud_resource_type  VARCHAR(20)   NULL,
    -- Quota tracking
    ADD COLUMN IF NOT EXISTS quota_owner_id      BIGINT    NULL,
    ADD COLUMN IF NOT EXISTS quota_released_at   TIMESTAMP NULL,
    -- Cleanup lifecycle
    ADD COLUMN IF NOT EXISTS cloud_delete_failed_id VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS cloud_delete_attempts  INTEGER NOT NULL DEFAULT 0,
    -- Uploader identity snapshots (replacing client-supplied fields)
    ADD COLUMN IF NOT EXISTS uploader_name_snapshot  VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS uploader_email_snapshot VARCHAR(254) NULL;

-- Backfill quota_owner_id for existing PENDING_REVIEW submissions
UPDATE shared_document_submissions
SET quota_owner_id = owner_user_id
WHERE quota_owner_id IS NULL;

-- Existing local-staging submissions are intentionally not enrolled in the new
-- Cloudinary cleanup lifecycle. Inspect production data before adding any legacy
-- compatibility path; new submissions never use local staging.
CREATE INDEX IF NOT EXISTS idx_sds_cloud_delete_retry
    ON shared_document_submissions(cloud_delete_failed_id)
    WHERE cloud_delete_failed_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sds_quota_owner   ON shared_document_submissions(quota_owner_id);


-- ─── 4. Enforce uploader_user_id NOT NULL for new rows (optional constraint) ──
-- Existing anonymous rows may have NULL; we preserve them.
-- New rows will have this enforced at the application layer.
-- To add a constraint only for future rows, a check constraint is not standard;
-- application-layer validation is sufficient.


-- ─── 5. Summary ──────────────────────────────────────────────────────────────
-- Tables modified:
--   document_share_link_allowed_users  (CREATED)
--   document_share_links               (access_policy, limits, active_stored_bytes)
--   shared_document_submissions        (Cloudinary metadata, quota fields, cleanup fields, snapshot fields)
--
-- Migration defaults:
--   All existing links → access_policy = PRIVATE_ALLOWLIST (fail-closed)
--   Failed Cloudinary deletions are retried using cloud_delete_failed_id
--   quota_owner_id backfilled from owner_user_id for all existing submissions
--
-- Post-migration verification:
--   SELECT COUNT(*) FROM document_share_links WHERE access_policy IS NULL;  -- must be 0
--   SELECT COUNT(*) FROM shared_document_submissions WHERE quota_owner_id IS NULL
--     AND status = 'PENDING_REVIEW';  -- must be 0
-- =============================================================================
