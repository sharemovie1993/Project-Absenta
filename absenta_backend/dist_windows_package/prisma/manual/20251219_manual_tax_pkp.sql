BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxType') THEN
    CREATE TYPE "TaxType" AS ENUM ('NONE', 'PPN');
  END IF;
END
$$;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "subtotal_amount" integer;
UPDATE "Invoice"
  SET "subtotal_amount" = COALESCE("subtotal_amount", 0);
ALTER TABLE "Invoice"
  ALTER COLUMN "subtotal_amount" SET DEFAULT 0,
  ALTER COLUMN "subtotal_amount" SET NOT NULL;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "tax_rate" integer;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "tax_amount" integer;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "tax_label" text;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "tax_type" "TaxType";
UPDATE "Invoice"
  SET "tax_type" = COALESCE("tax_type", 'NONE');
ALTER TABLE "Invoice"
  ALTER COLUMN "tax_type" SET DEFAULT 'NONE',
  ALTER COLUMN "tax_type" SET NOT NULL;

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "total_amount" integer;
UPDATE "Invoice"
  SET "total_amount" = COALESCE("total_amount", "amount");
ALTER TABLE "Invoice"
  ALTER COLUMN "total_amount" SET NOT NULL;

ALTER TABLE "SystemConfig"
  ADD COLUMN IF NOT EXISTS "is_pkp" boolean;
UPDATE "SystemConfig"
  SET "is_pkp" = COALESCE("is_pkp", false);
ALTER TABLE "SystemConfig"
  ALTER COLUMN "is_pkp" SET DEFAULT false,
  ALTER COLUMN "is_pkp" SET NOT NULL;

ALTER TABLE "SystemConfig"
  ADD COLUMN IF NOT EXISTS "ppn_rate" integer;
UPDATE "SystemConfig"
  SET "ppn_rate" = COALESCE("ppn_rate", 11);
ALTER TABLE "SystemConfig"
  ALTER COLUMN "ppn_rate" SET DEFAULT 11,
  ALTER COLUMN "ppn_rate" SET NOT NULL;

COMMIT;
