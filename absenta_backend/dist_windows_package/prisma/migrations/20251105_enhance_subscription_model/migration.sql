-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "invoice_id" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "billing_period" "BillingPeriod" NOT NULL DEFAULT 'MONTH',
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "features_json" JSONB,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "price_yearly" INTEGER,
ADD COLUMN     "trial_days" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancel_date" TIMESTAMP(3),
ADD COLUMN     "canceled_by" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "renewal_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanFeature_plan_id_idx" ON "PlanFeature"("plan_id");

-- CreateIndex
CREATE INDEX "PlanFeature_key_idx" ON "PlanFeature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_billing_id_key" ON "Invoice"("billing_id");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_idx" ON "Payment"("invoice_id");

-- CreateIndex
CREATE INDEX "Plan_is_active_idx" ON "Plan"("is_active");

-- CreateIndex
CREATE INDEX "Plan_price_monthly_idx" ON "Plan"("price_monthly");

-- CreateIndex
CREATE INDEX "Plan_name_idx" ON "Plan"("name");

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
