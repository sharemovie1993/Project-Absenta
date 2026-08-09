-- CreateTable
CREATE TABLE "audit_log_archive" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "tenant_id" TEXT,
    "severity" TEXT NOT NULL,
    "metadata" JSONB,
    "correlation_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregated_metric_daily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tenant_id" TEXT,
    "metric_key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "aggregated_metric_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_archive_created_at_idx" ON "audit_log_archive"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_archive_tenant_id_created_at_idx" ON "audit_log_archive"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "aggregated_metric_daily_metric_key_date_idx" ON "aggregated_metric_daily"("metric_key", "date");

-- CreateIndex
CREATE UNIQUE INDEX "aggregated_metric_daily_date_tenant_id_metric_key_key" ON "aggregated_metric_daily"("date", "tenant_id", "metric_key");

-- CreateIndex
CREATE INDEX "ActivityLog_created_at_idx" ON "ActivityLog"("created_at");
