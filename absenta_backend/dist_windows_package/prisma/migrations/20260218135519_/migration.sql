/*
  Warnings:

  - A unique constraint covering the columns `[subscription_id,billing_date]` on the table `Billing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'UPGRADE_PENDING';

-- AlterTable
ALTER TABLE "Billing" ADD COLUMN     "plan_change_request_id" TEXT,
ADD COLUMN     "upgrade_plan_id_snapshot" TEXT,
ADD COLUMN     "upgrade_price_snapshot" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Billing_subscription_id_billing_date_key" ON "Billing"("subscription_id", "billing_date");

-- Enforce at most one SCHEDULED PlanChangeRequest per subscription
CREATE UNIQUE INDEX "PlanChangeRequest_subscription_id_scheduled_unique"
  ON "PlanChangeRequest"("subscription_id")
  WHERE "status" = 'SCHEDULED';
