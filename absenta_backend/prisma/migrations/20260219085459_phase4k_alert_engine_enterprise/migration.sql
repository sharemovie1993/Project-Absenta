-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "threshold_value" DOUBLE PRECISION NOT NULL,
    "window_start" TIMESTAMPTZ NOT NULL,
    "window_end" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "cooldown_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertLog_alert_type_status_idx" ON "AlertLog"("alert_type", "status");

-- CreateIndex
CREATE INDEX "AlertLog_created_at_idx" ON "AlertLog"("created_at");

-- CreateIndex
CREATE INDEX "QueueJobLog_queue_name_created_at_idx" ON "QueueJobLog"("queue_name", "created_at");

-- CreateIndex
CREATE INDEX "QueueJobLog_job_type_status_created_at_idx" ON "QueueJobLog"("job_type", "status", "created_at");

-- CreateIndex
CREATE INDEX "QueueJobLog_status_created_at_idx" ON "QueueJobLog"("status", "created_at");

-- CreateIndex
CREATE INDEX "QueueJobLog_tenant_id_created_at_idx" ON "QueueJobLog"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "SystemEventLog_event_type_created_at_idx" ON "SystemEventLog"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "SystemEventLog_domain_created_at_idx" ON "SystemEventLog"("domain", "created_at");

-- CreateIndex
CREATE INDEX "SystemEventLog_tenant_id_created_at_idx" ON "SystemEventLog"("tenant_id", "created_at");
