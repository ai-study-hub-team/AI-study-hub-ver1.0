ALTER TABLE token_usage_logs
    ADD COLUMN IF NOT EXISTS input_token BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS output_token BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pricing_id BIGINT,
    ADD COLUMN IF NOT EXISTS input_price_per_million NUMERIC(19, 6) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS output_price_per_million NUMERIC(19, 6) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS input_cost NUMERIC(19, 12) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS output_cost NUMERIC(19, 12) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC(19, 12) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at
    ON token_usage_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_user_created_at
    ON token_usage_logs (user_id, created_at);

WITH active_pricing AS (
    SELECT
        id,
        input_price_per_million,
        output_price_per_million,
        currency
    FROM token_pricings
    WHERE active = TRUE
    ORDER BY updated_at DESC
    LIMIT 1
),
daily_log_totals AS (
    SELECT
        user_id,
        created_at::date AS usage_date,
        SUM(tokens) AS daily_log_tokens
    FROM token_usage_logs
    GROUP BY user_id, created_at::date
),
allocated_logs AS (
    SELECT
        l.id,
        CASE
            WHEN d.daily_log_tokens > 0
                 AND COALESCE(u.input_token, 0) + COALESCE(u.output_token, 0) > 0
                THEN ROUND(l.tokens::numeric * COALESCE(u.input_token, 0)::numeric / d.daily_log_tokens)::bigint
            ELSE l.tokens
        END AS allocated_input_token,
        CASE
            WHEN d.daily_log_tokens > 0
                 AND COALESCE(u.input_token, 0) + COALESCE(u.output_token, 0) > 0
                THEN ROUND(l.tokens::numeric * COALESCE(u.output_token, 0)::numeric / d.daily_log_tokens)::bigint
            ELSE 0
        END AS allocated_output_token
    FROM token_usage_logs l
    JOIN daily_log_totals d
        ON d.user_id = l.user_id
       AND d.usage_date = l.created_at::date
    LEFT JOIN user_daily_usages u
        ON u.user_id = l.user_id
       AND u.usage_date = l.created_at::date
)
UPDATE token_usage_logs l
SET
    input_token = a.allocated_input_token,
    output_token = a.allocated_output_token,
    pricing_id = p.id,
    input_price_per_million = p.input_price_per_million,
    output_price_per_million = p.output_price_per_million,
    currency = p.currency,
    input_cost = (a.allocated_input_token::numeric * p.input_price_per_million / 1000000),
    output_cost = (a.allocated_output_token::numeric * p.output_price_per_million / 1000000),
    total_cost = (a.allocated_input_token::numeric * p.input_price_per_million / 1000000)
               + (a.allocated_output_token::numeric * p.output_price_per_million / 1000000)
FROM allocated_logs a
CROSS JOIN active_pricing p
WHERE l.id = a.id
  AND l.input_cost = 0
  AND l.output_cost = 0
  AND l.total_cost = 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_token_usage_logs_pricing'
    ) THEN
        ALTER TABLE token_usage_logs
            ADD CONSTRAINT fk_token_usage_logs_pricing
            FOREIGN KEY (pricing_id) REFERENCES token_pricings(id);
    END IF;
END $$;

ALTER TABLE user_daily_usages
    DROP COLUMN IF EXISTS input_token,
    DROP COLUMN IF EXISTS output_token;
