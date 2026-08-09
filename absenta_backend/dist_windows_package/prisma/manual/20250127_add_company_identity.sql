ALTER TABLE "SystemConfig" ADD COLUMN "company_legal_name" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_trade_name" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_npwp" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_address" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_email_billing" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_phone_billing" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_logo_url" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_signature_name" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN "company_signature_title" TEXT;

-- Seed default values for Global Config (tenant_id IS NULL)
-- We assume there is at least one Global Config or we update if exists.
-- If no global config exists, we might need to insert one, but usually it exists or is created on demand.
-- We will try to update existing global config.
UPDATE "SystemConfig"
SET
  company_legal_name = 'PT BARAYA TEKNOLOGI INDONESIA',
  company_trade_name = 'Baraya Tekno',
  company_address = 'Jl. Buah Batu No. 123, Bandung',
  company_email_billing = 'billing@baraya.co.id'
WHERE tenant_id IS NULL;
