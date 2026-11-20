-- AlterTable
ALTER TABLE "Guru" ADD COLUMN IF NOT EXISTS "is_app_installed" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "app_version" TEXT,
ADD COLUMN IF NOT EXISTS "ota_version" TEXT,
ADD COLUMN IF NOT EXISTS "device_model" TEXT,
ADD COLUMN IF NOT EXISTS "device_os" TEXT,
ADD COLUMN IF NOT EXISTS "device_uuid" TEXT,
ADD COLUMN IF NOT EXISTS "last_app_seen_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Guru_tenant_id_is_app_installed_idx" ON "Guru"("tenant_id", "is_app_installed");
