-- expenses.date 컬럼을 NOT NULL로 변경
-- NULL인 기존 행은 created_at 기준으로 채우고, 이후 기본값 CURRENT_DATE 적용

UPDATE expenses
SET date = (created_at AT TIME ZONE 'UTC')::date
WHERE date IS NULL;

ALTER TABLE expenses
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN date SET DEFAULT CURRENT_DATE;
