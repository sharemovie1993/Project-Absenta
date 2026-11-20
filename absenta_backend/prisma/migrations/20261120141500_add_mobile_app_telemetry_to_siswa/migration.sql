-- Migration: add mobile app telemetry to Siswa
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "is_app_installed" BOOLEAN DEFAULT false;
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "app_version" TEXT;
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "ota_version" TEXT;
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "device_model" TEXT;
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "device_os" TEXT;
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "device_uuid" TEXT;
ALTER TABLE "Siswa" ADD COLUMN IF NOT EXISTS "last_app_seen_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "Siswa_tenant_id_is_app_installed_idx" ON "Siswa"("tenant_id", "is_app_installed");
