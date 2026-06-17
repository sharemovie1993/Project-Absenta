-- CreateTable
CREATE TABLE "tenant_risk_score_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_level" "TenantRiskLevel" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_risk_score_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_risk_score_log_tenant_id_created_at_idx" ON "tenant_risk_score_log"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "tenant_risk_score_log_created_at_idx" ON "tenant_risk_score_log"("created_at");

-- AddForeignKey
ALTER TABLE "tenant_risk_score_log" ADD CONSTRAINT "tenant_risk_score_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
