/*
  Warnings:

  - You are about to drop the column `due_date` on the `Billing` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_number` on the `Billing` table. All the data in the column will be lost.
  - You are about to drop the column `paid_at` on the `Billing` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Billing` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('RECURRING', 'UPGRADE', 'ONE_TIME_FEE');

-- DropIndex
DROP INDEX "Billing_tenant_id_invoice_number_key";

-- AlterTable
ALTER TABLE "Billing" DROP COLUMN "due_date",
DROP COLUMN "invoice_number",
DROP COLUMN "paid_at",
DROP COLUMN "status",
ADD COLUMN     "charge_type" "ChargeType" NOT NULL DEFAULT 'RECURRING';
