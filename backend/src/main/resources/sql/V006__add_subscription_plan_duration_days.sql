ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS duration_days INTEGER;

UPDATE subscription_plans
SET duration_days = 30
WHERE code = 'PRO'
  AND duration_days IS NULL;

UPDATE subscription_plans
SET duration_days = NULL
WHERE code = 'FREE';
