DO $$
BEGIN
  ALTER TYPE "PlanChangeType" ADD VALUE 'CANCEL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PlanChangeRequest"
  ALTER COLUMN "to_plan_id" DROP NOT NULL;
