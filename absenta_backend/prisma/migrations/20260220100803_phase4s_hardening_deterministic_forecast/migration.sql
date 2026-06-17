/*
  Warnings:

  - A unique constraint covering the columns `[cohort_month,month]` on the table `tenant_cohort_monthly` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `month` to the `tenant_cohort_monthly` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tenant_cohort_monthly_cohort_month_key";

-- AlterTable
ALTER TABLE "revenue_forecast_monthly" ADD COLUMN     "churn_rate" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projected_mrr" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "risk_adjustment" DECIMAL(18,2),
ADD COLUMN     "risk_score_snapshot" DECIMAL(10,4),
ADD COLUMN     "total_mrr" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenant_cohort_monthly" ADD COLUMN     "churned_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "month" DATE;

UPDATE "tenant_cohort_monthly"
SET "month" = "cohort_month"::date
WHERE "month" IS NULL;

ALTER TABLE "tenant_cohort_monthly" ALTER COLUMN "month" SET NOT NULL;

-- CreateTable
CREATE TABLE "forecast_job_lock" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_job_lock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forecast_job_lock_job_id_key" ON "forecast_job_lock"("job_id");

-- CreateIndex
CREATE INDEX "forecast_job_lock_month_idx" ON "forecast_job_lock"("month");

-- CreateIndex
CREATE INDEX "tenant_cohort_monthly_month_idx" ON "tenant_cohort_monthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_cohort_monthly_cohort_month_month_key" ON "tenant_cohort_monthly"("cohort_month", "month");
