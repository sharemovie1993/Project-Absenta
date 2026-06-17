-- CreateTable
CREATE TABLE "revenue_forecast_monthly" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "forecast_mrr" DOUBLE PRECISION NOT NULL,
    "forecast_arr" DOUBLE PRECISION NOT NULL,
    "projected_churn_loss" DOUBLE PRECISION NOT NULL,
    "projected_upgrade_gain" DOUBLE PRECISION NOT NULL,
    "projected_net_revenue" DOUBLE PRECISION NOT NULL,
    "risk_adjusted_forecast" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_forecast_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_cohort_monthly" (
    "id" TEXT NOT NULL,
    "cohort_month" DATE NOT NULL,
    "active_count" INTEGER NOT NULL,
    "retained_after_1_month" INTEGER NOT NULL,
    "retained_after_3_month" INTEGER NOT NULL,
    "retained_after_6_month" INTEGER NOT NULL,
    "retained_after_12_month" INTEGER NOT NULL,
    "revenue_generated" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_cohort_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_forecast_monthly_month_key" ON "revenue_forecast_monthly"("month");

-- CreateIndex
CREATE INDEX "revenue_forecast_monthly_month_idx" ON "revenue_forecast_monthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_cohort_monthly_cohort_month_key" ON "tenant_cohort_monthly"("cohort_month");
