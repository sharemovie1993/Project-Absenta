/*
  Warnings:

  - You are about to drop the column `timestamp` on the `ActivityLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ActivityLog_tenant_id_idx";

-- DropIndex
DROP INDEX "Billing_tenant_id_idx";

-- DropIndex
DROP INDEX "Invoice_tenant_id_idx";

-- DropIndex
DROP INDEX "NotificationLog_tenant_id_idx";

-- DropIndex
DROP INDEX "Payment_tenant_id_idx";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "timestamp",
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ActivityLog_tenant_id_created_at_idx" ON "ActivityLog"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "Billing_tenant_id_created_at_idx" ON "Billing"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "Invoice_tenant_id_created_at_idx" ON "Invoice"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "NotificationLog_tenant_id_created_at_idx" ON "NotificationLog"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_created_at_idx" ON "Payment"("tenant_id", "created_at");
