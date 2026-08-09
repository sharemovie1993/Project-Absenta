-- CreateTable
CREATE TABLE "tenant_upgrade_score_monthly" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "intent_score" INTEGER NOT NULL,
    "intent_level" TEXT NOT NULL,
    "upgrade_attempt_count" INTEGER NOT NULL,
    "upgrade_paid_count" INTEGER NOT NULL,
    "usage_growth_percent" DOUBLE PRECISION,
    "invoice_overdue_count" INTEGER NOT NULL,
    "risk_score_snapshot" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_upgrade_score_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upgrade_funnel_monthly" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "month" TEXT NOT NULL,
    "intent_count" INTEGER NOT NULL,
    "invoice_created_count" INTEGER NOT NULL,
    "invoice_paid_count" INTEGER NOT NULL,
    "upgrade_applied_count" INTEGER NOT NULL,
    "conversion_rate" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upgrade_funnel_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upgrade_intelligence_job_lock" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "month" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upgrade_intelligence_job_lock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_upgrade_score_monthly_tenant_id_month_key" ON "tenant_upgrade_score_monthly"("tenant_id", "month");

-- CreateIndex
CREATE INDEX "tenant_upgrade_score_monthly_month_idx" ON "tenant_upgrade_score_monthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "upgrade_funnel_monthly_month_key" ON "upgrade_funnel_monthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "upgrade_intelligence_job_lock_month_key" ON "upgrade_intelligence_job_lock"("month");
