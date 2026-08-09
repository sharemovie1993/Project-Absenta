/*
  Warnings:

  - Added the required column `billing_date` to the `Billing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Billing" ADD COLUMN     "billing_date" TIMESTAMP(3) NOT NULL;
