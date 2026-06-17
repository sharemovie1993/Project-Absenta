-- CreateEnum
CREATE TYPE "BackupFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "app_name" TEXT,
    "default_language" TEXT DEFAULT 'id',
    "timezone" TEXT DEFAULT 'Asia/Jakarta',
    "date_format" TEXT DEFAULT 'DD/MM/YYYY',
    "stripe_enabled" BOOLEAN NOT NULL DEFAULT false,
    "stripe_secret_key" TEXT,
    "stripe_publishable_key" TEXT,
    "stripe_webhook_secret" TEXT,
    "stripe_webhook_url" TEXT,
    "midtrans_enabled" BOOLEAN NOT NULL DEFAULT false,
    "midtrans_server_key" TEXT,
    "midtrans_client_key" TEXT,
    "midtrans_environment" TEXT DEFAULT 'sandbox',
    "midtrans_webhook_url" TEXT,
    "xendit_enabled" BOOLEAN NOT NULL DEFAULT false,
    "xendit_secret_key" TEXT,
    "xendit_public_key" TEXT,
    "xendit_callback_token" TEXT,
    "xendit_webhook_url" TEXT,
    "notif_email_new_payment" BOOLEAN NOT NULL DEFAULT true,
    "notif_email_payment_failed" BOOLEAN NOT NULL DEFAULT true,
    "notif_email_subscription_expired" BOOLEAN NOT NULL DEFAULT true,
    "notif_email_monthly_summary" BOOLEAN NOT NULL DEFAULT false,
    "webhook_payment_status" BOOLEAN NOT NULL DEFAULT true,
    "webhook_subscription_changes" BOOLEAN NOT NULL DEFAULT true,
    "webhook_billing_events" BOOLEAN NOT NULL DEFAULT true,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 30,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "login_attempt_monitoring" BOOLEAN NOT NULL DEFAULT true,
    "backup_frequency" "BackupFrequency" NOT NULL DEFAULT 'DAILY',
    "log_retention_days" INTEGER NOT NULL DEFAULT 30,
    "max_upload_mb" INTEGER NOT NULL DEFAULT 10,
    "api_rate_limit_per_minute" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemConfig_tenant_id_idx" ON "SystemConfig"("tenant_id");

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
