ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS max_share_links_per_day INTEGER NOT NULL DEFAULT 5;

UPDATE subscription_plans
SET max_share_links_per_day = 20
WHERE UPPER(code) = 'PRO';
