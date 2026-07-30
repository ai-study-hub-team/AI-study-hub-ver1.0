-- A published plan version is immutable. Existing subscriptions continue to
-- reference their current plan_id while new purchases use the active version.
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP,
    ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS previous_version_id BIGINT;

UPDATE subscription_plans
SET effective_from = COALESCE(effective_from, created_at, CURRENT_TIMESTAMP);

ALTER TABLE subscription_plans
    ALTER COLUMN effective_from SET NOT NULL;

-- Remove the legacy unique constraint on code. Constraint names can differ
-- between Hibernate-created databases, so discover it from the catalog.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = current_schema()
          AND rel.relname = 'subscription_plans'
          AND con.contype = 'u'
          AND (
              SELECT array_agg(att.attname ORDER BY key_columns.ordinality)
              FROM unnest(con.conkey) WITH ORDINALITY AS key_columns(attnum, ordinality)
              JOIN pg_attribute att
                ON att.attrelid = rel.oid
               AND att.attnum = key_columns.attnum
          ) = ARRAY['code']::name[]
    LOOP
        EXECUTE format(
            'ALTER TABLE subscription_plans DROP CONSTRAINT %I',
            constraint_name
        );
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_plan_code_version
    ON subscription_plans (code, version);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_subscription_plan_code
    ON subscription_plans (code)
    WHERE is_active = TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_subscription_plan_previous_version'
    ) THEN
        ALTER TABLE subscription_plans
            ADD CONSTRAINT fk_subscription_plan_previous_version
            FOREIGN KEY (previous_version_id)
            REFERENCES subscription_plans(id);
    END IF;
END $$;

-- Plan versions now preserve purchased benefits. user_subscriptions only needs
-- to identify the exact immutable plan version through plan_id.
ALTER TABLE user_subscriptions
    DROP COLUMN IF EXISTS snapshot_storage_limit_mb,
    DROP COLUMN IF EXISTS snapshot_max_upload_size_per_file_mb,
    DROP COLUMN IF EXISTS snapshot_daily_token_limit,
    DROP COLUMN IF EXISTS snapshot_allow_image_upload,
    DROP COLUMN IF EXISTS snapshot_allow_document_upload,
    DROP COLUMN IF EXISTS snapshot_allow_video_upload,
    DROP COLUMN IF EXISTS snapshot_allow_audio_upload;
