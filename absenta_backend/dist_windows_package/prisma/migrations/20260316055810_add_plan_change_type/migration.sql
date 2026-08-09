DO $$
BEGIN
  CREATE TYPE "PlanChangeType" AS ENUM ('UPGRADE', 'DOWNGRADE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PlanChangeRequest"
  ADD COLUMN IF NOT EXISTS "change_type" "PlanChangeType" NOT NULL DEFAULT 'UPGRADE';

UPDATE "PlanChangeRequest"
SET "change_type" = 'UPGRADE'
WHERE "change_type" IS NULL;
