ALTER TABLE user_daily_usages
    ADD COLUMN IF NOT EXISTS input_token BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS output_token BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS token_pricings (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    input_price_per_million NUMERIC(19, 6) NOT NULL,
    output_price_per_million NUMERIC(19, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO token_pricings (
    model_name,
    input_price_per_million,
    output_price_per_million,
    currency,
    active
)
SELECT
    'Gemini 3.1 Flash-Lite',
    0.25,
    1.50,
    'USD',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM token_pricings
    WHERE active = TRUE
);
