-- ============================================================
-- add_ai_usage_events.sql
-- Idempotent migration: dedicated event table for counting
-- successful CHAT / QUIZ / SUMMARY AI feature executions.
--
-- Rationale: token_usage_logs only records when tokens > 0
-- (skipped on Gemini fallback). user_daily_usages is aggregated
-- and cannot support per-feature counts across WEEK/MONTH/YEAR.
-- This table records exactly one row per successful execution,
-- independent of token count.
--
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage_events (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL,
    feature_type VARCHAR(30)  NOT NULL,   -- CHAT | QUIZ | SUMMARY
    document_id  BIGINT       NULL,       -- optional: linked document
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_usage_events_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Composite index for analytics queries: user + time range
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
    ON ai_usage_events (user_id, created_at);

-- Composite index for grouped feature queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_feature_created
    ON ai_usage_events (user_id, feature_type, created_at);
