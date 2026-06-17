CREATE TABLE "RefundRecord" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" TEXT NOT NULL,
  "invoice_id" TEXT,
  "payment_id" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "reason" TEXT,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "RefundRecord"
  ADD CONSTRAINT "RefundRecord_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundRecord"
  ADD CONSTRAINT "RefundRecord_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefundRecord"
  ADD CONSTRAINT "RefundRecord_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RefundRecord_tenant_id_idx" ON "RefundRecord"("tenant_id");
CREATE INDEX "RefundRecord_invoice_id_idx" ON "RefundRecord"("invoice_id");
CREATE INDEX "RefundRecord_payment_id_idx" ON "RefundRecord"("payment_id");

CREATE TYPE "PlanChangeStatus" AS ENUM ('SCHEDULED', 'APPLIED', 'CANCELLED');

CREATE TABLE "PlanChangeRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" TEXT NOT NULL,
  "from_plan_id" TEXT NOT NULL,
  "to_plan_id" TEXT NOT NULL,
  "effective_date" TIMESTAMPTZ NOT NULL,
  "status" "PlanChangeStatus" NOT NULL DEFAULT 'SCHEDULED',
  "price_snapshot" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "PlanChangeRequest"
  ADD CONSTRAINT "PlanChangeRequest_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanChangeRequest"
  ADD CONSTRAINT "PlanChangeRequest_from_plan_id_fkey" FOREIGN KEY ("from_plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanChangeRequest"
  ADD CONSTRAINT "PlanChangeRequest_to_plan_id_fkey" FOREIGN KEY ("to_plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PlanChangeRequest_subscription_id_idx" ON "PlanChangeRequest"("subscription_id");
CREATE INDEX "PlanChangeRequest_status_effective_date_idx" ON "PlanChangeRequest"("status", "effective_date");
