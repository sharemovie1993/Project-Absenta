/*
  Warnings:

  - You are about to drop the column `permissions` on the `Role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenant_id,name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "scope_template" JSONB,
ALTER COLUMN "group" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "permissions",
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "parent_app_attendance_history_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_app_daily_tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_app_dashboard_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_app_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_app_monthly_recap_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_app_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_app_report_absence_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Role_tenant_id_idx" ON "Role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenant_id_name_key" ON "Role"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
