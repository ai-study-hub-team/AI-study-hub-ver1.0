-- Preserve the benefits assigned to a user even when an administrator edits
-- the corresponding catalog plan later.
ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS snapshot_storage_limit_mb BIGINT,
    ADD COLUMN IF NOT EXISTS snapshot_max_upload_size_per_file_mb BIGINT,
    ADD COLUMN IF NOT EXISTS snapshot_daily_token_limit BIGINT,
    ADD COLUMN IF NOT EXISTS snapshot_allow_image_upload BOOLEAN,
    ADD COLUMN IF NOT EXISTS snapshot_allow_document_upload BOOLEAN,
    ADD COLUMN IF NOT EXISTS snapshot_allow_video_upload BOOLEAN,
    ADD COLUMN IF NOT EXISTS snapshot_allow_audio_upload BOOLEAN;

-- Capture the currently assigned benefits for subscriptions created before
-- snapshot support. Run this before changing any catalog plan after deployment.
UPDATE user_subscriptions AS subscription
SET snapshot_storage_limit_mb = COALESCE(
        subscription.snapshot_storage_limit_mb,
        plan.storage_limit_mb
    ),
    snapshot_max_upload_size_per_file_mb = COALESCE(
        subscription.snapshot_max_upload_size_per_file_mb,
        plan.max_upload_size_per_file_mb
    ),
    snapshot_daily_token_limit = COALESCE(
        subscription.snapshot_daily_token_limit,
        plan.daily_token_limit
    ),
    snapshot_allow_image_upload = COALESCE(
        subscription.snapshot_allow_image_upload,
        plan.allow_image_upload
    ),
    snapshot_allow_document_upload = COALESCE(
        subscription.snapshot_allow_document_upload,
        plan.allow_document_upload
    ),
    snapshot_allow_video_upload = COALESCE(
        subscription.snapshot_allow_video_upload,
        plan.allow_video_upload
    ),
    snapshot_allow_audio_upload = COALESCE(
        subscription.snapshot_allow_audio_upload,
        plan.allow_audio_upload
    )
FROM subscription_plans AS plan
WHERE subscription.plan_id = plan.id;

ALTER TABLE user_subscriptions
    ALTER COLUMN snapshot_storage_limit_mb SET NOT NULL,
    ALTER COLUMN snapshot_max_upload_size_per_file_mb SET NOT NULL,
    ALTER COLUMN snapshot_daily_token_limit SET NOT NULL,
    ALTER COLUMN snapshot_allow_image_upload SET NOT NULL,
    ALTER COLUMN snapshot_allow_document_upload SET NOT NULL,
    ALTER COLUMN snapshot_allow_video_upload SET NOT NULL,
    ALTER COLUMN snapshot_allow_audio_upload SET NOT NULL;
