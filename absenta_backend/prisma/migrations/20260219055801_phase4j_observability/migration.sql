-- CreateTable
CREATE TABLE "SystemEventLog" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "tenant_id" TEXT,
    "severity" TEXT NOT NULL,
    "metadata" JSONB,
    "correlation_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueJobLog" (
    "id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt" INTEGER,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "tenant_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemEventLog_event_type_idx" ON "SystemEventLog"("event_type");

-- CreateIndex
CREATE INDEX "SystemEventLog_domain_idx" ON "SystemEventLog"("domain");

-- CreateIndex
CREATE INDEX "SystemEventLog_tenant_id_idx" ON "SystemEventLog"("tenant_id");

-- CreateIndex
CREATE INDEX "SystemEventLog_created_at_idx" ON "SystemEventLog"("created_at");

-- CreateIndex
CREATE INDEX "QueueJobLog_queue_name_idx" ON "QueueJobLog"("queue_name");

-- CreateIndex
CREATE INDEX "QueueJobLog_status_idx" ON "QueueJobLog"("status");

-- CreateIndex
CREATE INDEX "QueueJobLog_created_at_idx" ON "QueueJobLog"("created_at");
