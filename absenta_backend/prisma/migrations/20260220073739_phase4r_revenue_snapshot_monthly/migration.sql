-- CreateTable
CREATE TABLE "revenue_snapshot_monthly" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "tenant_id" TEXT,
    "mrr" DOUBLE PRECISION NOT NULL,
    "arr" DOUBLE PRECISION NOT NULL,
    "churn_amount" DOUBLE PRECISION NOT NULL,
    "upgrade_gain" DOUBLE PRECISION NOT NULL,
    "downgrade_loss" DOUBLE PRECISION NOT NULL,
    "nrr" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "revenue_snapshot_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revenue_snapshot_monthly_month_tenant_id_idx" ON "revenue_snapshot_monthly"("month", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_snapshot_monthly_month_tenant_id_key" ON "revenue_snapshot_monthly"("month", "tenant_id");
