ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "service_code" TEXT;

UPDATE "Plan"
SET
  "code" = COALESCE("code", regexp_replace(upper("name"), '[^A-Z0-9]+', '_', 'g')),
  "service_code" = COALESCE(
    "service_code",
    CASE
      WHEN "name" = 'CORE_PLATFORM' THEN 'CORE'
      WHEN "name" ILIKE 'Absensi-%' THEN 'ABSENSI'
      WHEN "name" ILIKE 'Koperasi-%' THEN 'KOPERASI'
      ELSE 'CORE'
    END
  )
WHERE "code" IS NULL OR "service_code" IS NULL;

ALTER TABLE "Plan" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Plan" ALTER COLUMN "service_code" SET NOT NULL;

DO $$
BEGIN
  CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "service_code" TEXT;

UPDATE "Subscription" s
SET "service_code" = COALESCE(s."service_code", p."service_code")
FROM "Plan" p
WHERE s."plan_id" = p."id" AND (s."service_code" IS NULL OR s."service_code" = '');

UPDATE "Subscription"
SET "service_code" = 'CORE'
WHERE "service_code" IS NULL OR "service_code" = '';

ALTER TABLE "Subscription" ALTER COLUMN "service_code" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "Addon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_monthly" INTEGER NOT NULL,
  "price_yearly" INTEGER,
  "service_code" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Addon_code_key" ON "Addon"("code");
CREATE INDEX IF NOT EXISTS "Addon_service_code_idx" ON "Addon"("service_code");

CREATE TABLE IF NOT EXISTS "PlanAddon" (
  "plan_id" TEXT NOT NULL,
  "addon_id" TEXT NOT NULL,
  CONSTRAINT "PlanAddon_pkey" PRIMARY KEY ("plan_id","addon_id")
);

CREATE INDEX IF NOT EXISTS "PlanAddon_plan_id_idx" ON "PlanAddon"("plan_id");
CREATE INDEX IF NOT EXISTS "PlanAddon_addon_id_idx" ON "PlanAddon"("addon_id");

DO $$
BEGIN
  ALTER TABLE "PlanAddon" ADD CONSTRAINT "PlanAddon_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PlanAddon" ADD CONSTRAINT "PlanAddon_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SubscriptionAddon" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "addon_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionAddon_subscription_id_addon_id_key" ON "SubscriptionAddon"("subscription_id","addon_id");
CREATE INDEX IF NOT EXISTS "SubscriptionAddon_subscription_id_idx" ON "SubscriptionAddon"("subscription_id");
CREATE INDEX IF NOT EXISTS "SubscriptionAddon_addon_id_idx" ON "SubscriptionAddon"("addon_id");

DO $$
BEGIN
  ALTER TABLE "SubscriptionAddon" ADD CONSTRAINT "SubscriptionAddon_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SubscriptionAddon" ADD CONSTRAINT "SubscriptionAddon_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
