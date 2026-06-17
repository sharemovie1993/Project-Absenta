-- AlterTable
ALTER TABLE "LogTap" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "LogTap_tenant_id_created_at_idx" ON "LogTap"("tenant_id", "created_at");
