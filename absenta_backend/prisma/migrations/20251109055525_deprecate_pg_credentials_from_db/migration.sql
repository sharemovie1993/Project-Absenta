/*
  Warnings:

  - You are about to drop the column `midtrans_client_key` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `midtrans_server_key` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `midtrans_webhook_url` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_publishable_key` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_secret_key` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_webhook_secret` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_webhook_url` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_callback_token` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_public_key` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_secret_key` on the `SystemConfig` table. All the data in the column will be lost.
  - You are about to drop the column `xendit_webhook_url` on the `SystemConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemConfig" DROP COLUMN "midtrans_client_key",
DROP COLUMN "midtrans_server_key",
DROP COLUMN "midtrans_webhook_url",
DROP COLUMN "stripe_publishable_key",
DROP COLUMN "stripe_secret_key",
DROP COLUMN "stripe_webhook_secret",
DROP COLUMN "stripe_webhook_url",
DROP COLUMN "xendit_callback_token",
DROP COLUMN "xendit_public_key",
DROP COLUMN "xendit_secret_key",
DROP COLUMN "xendit_webhook_url";
