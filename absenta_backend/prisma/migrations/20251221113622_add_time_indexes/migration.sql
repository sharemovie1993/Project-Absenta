-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('NONE', 'PPN');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "subtotal_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tax_label" TEXT,
ADD COLUMN     "tax_rate" INTEGER,
ADD COLUMN     "tax_type" "TaxType" NOT NULL DEFAULT 'NONE',
ALTER COLUMN "tax_amount" DROP NOT NULL,
ALTER COLUMN "tax_amount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlanChangeRequest" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RefundRecord" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "company_address" TEXT,
ADD COLUMN     "company_email_billing" TEXT,
ADD COLUMN     "company_legal_name" TEXT,
ADD COLUMN     "company_logo_url" TEXT,
ADD COLUMN     "company_npwp" TEXT,
ADD COLUMN     "company_phone_billing" TEXT,
ADD COLUMN     "company_signature_name" TEXT,
ADD COLUMN     "company_signature_title" TEXT,
ADD COLUMN     "company_trade_name" TEXT,
ADD COLUMN     "is_pkp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ppn_rate" INTEGER NOT NULL DEFAULT 11;

-- CreateIndex
CREATE INDEX "AbsenSiswa_tenant_id_created_at_idx" ON "AbsenSiswa"("tenant_id", "created_at");
