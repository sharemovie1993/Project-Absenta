-- CreateEnum
CREATE TYPE "ObservabilityMetricType" AS ENUM ('EMAIL_SENT', 'EMAIL_FAILED', 'QUEUE_JOB_SUCCESS', 'QUEUE_JOB_FAILED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SUBSCRIPTION_SUSPENDED', 'SUBSCRIPTION_EXPIRED');

-- CreateTable
CREATE TABLE "ObservabilityMetric" (
    "id" TEXT NOT NULL,
    "metric_type" "ObservabilityMetricType" NOT NULL,
    "tenant_id" TEXT,
    "time_bucket" TIMESTAMPTZ NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ObservabilityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObservabilityMetric_metric_type_time_bucket_idx" ON "ObservabilityMetric"("metric_type", "time_bucket");

-- CreateIndex
CREATE INDEX "ObservabilityMetric_metric_type_tenant_id_time_bucket_idx" ON "ObservabilityMetric"("metric_type", "tenant_id", "time_bucket");

-- CreateIndex
CREATE INDEX "ObservabilityMetric_time_bucket_idx" ON "ObservabilityMetric"("time_bucket");

-- CreateIndex
CREATE UNIQUE INDEX "ObservabilityMetric_metric_type_tenant_id_time_bucket_key" ON "ObservabilityMetric"("metric_type", "tenant_id", "time_bucket");
