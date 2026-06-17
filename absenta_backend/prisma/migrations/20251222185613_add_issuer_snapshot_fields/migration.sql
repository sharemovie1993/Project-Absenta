/*
  Warnings:

  - The `tax_type` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoice_company_address" TEXT,
ADD COLUMN     "invoice_company_email_billing" TEXT,
ADD COLUMN     "invoice_company_legal_name" TEXT,
ADD COLUMN     "invoice_company_logo_url" TEXT,
ADD COLUMN     "invoice_company_npwp" TEXT,
ADD COLUMN     "invoice_company_phone_billing" TEXT,
ADD COLUMN     "invoice_company_signature_name" TEXT,
ADD COLUMN     "invoice_company_signature_title" TEXT,
ADD COLUMN     "invoice_company_trade_name" TEXT,
ADD COLUMN     "invoice_tenant_address" TEXT,
ADD COLUMN     "invoice_tenant_identifier" TEXT,
ADD COLUMN     "invoice_tenant_name" TEXT,
ADD COLUMN     "tax_included" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "tax_rate" SET DATA TYPE DOUBLE PRECISION,
DROP COLUMN "tax_type",
ADD COLUMN     "tax_type" TEXT;
