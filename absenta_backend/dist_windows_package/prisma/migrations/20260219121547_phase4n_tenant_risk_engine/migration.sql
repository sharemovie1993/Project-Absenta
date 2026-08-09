-- CreateEnum
CREATE TYPE "TenantRiskLevel" AS ENUM ('HEALTHY', 'WARNING', 'HIGH_RISK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TenantRiskEventSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "tenant_risk_score" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_level" "TenantRiskLevel" NOT NULL,
    "email_failure_rate" DOUBLE PRECISION NOT NULL,
    "payment_failure_rate" DOUBLE PRECISION NOT NULL,
    "suspension_count_30d" INTEGER NOT NULL,
    "invoice_overdue_count_30d" INTEGER NOT NULL,
    "renewal_delay_avg" DOUBLE PRECISION,
    "last_calculated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_risk_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_risk_event" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "severity" "TenantRiskEventSeverity" NOT NULL,
    "metric_value" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_risk_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_risk_score_tenant_id_key" ON "tenant_risk_score"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_risk_score_tenant_id_idx" ON "tenant_risk_score"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_risk_score_risk_level_idx" ON "tenant_risk_score"("risk_level");

-- CreateIndex
CREATE INDEX "tenant_risk_event_tenant_id_idx" ON "tenant_risk_event"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_risk_event_event_type_idx" ON "tenant_risk_event"("event_type");

-- CreateIndex
CREATE INDEX "tenant_risk_event_created_at_idx" ON "tenant_risk_event"("created_at");

-- AddForeignKey
ALTER TABLE "tenant_risk_score" ADD CONSTRAINT "tenant_risk_score_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_risk_event" ADD CONSTRAINT "tenant_risk_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
