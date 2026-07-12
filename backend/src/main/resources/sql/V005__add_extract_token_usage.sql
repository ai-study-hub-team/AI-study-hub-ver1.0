ALTER TABLE user_daily_usages
ADD COLUMN extract_tokens BIGINT NOT NULL DEFAULT 0,
ADD COLUMN overall_tokens BIGINT NOT NULL DEFAULT 0;

UPDATE user_daily_usages
SET overall_tokens = COALESCE(total_tokens, 0) + COALESCE(extract_tokens, 0);
