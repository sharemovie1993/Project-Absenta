-- Create table for Parent FCM tokens (native push notifications)
-- Ensures cascade on delete when parent (tenant-scoped) is removed
CREATE TABLE IF NOT EXISTS "ParentFcmToken" (
  "id" BIGSERIAL PRIMARY KEY,
  "orang_tua_id" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL DEFAULT 'android',
  "device_info" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key to OrangTua with ON DELETE CASCADE per Multi-Tenant Cascade Rule
ALTER TABLE "ParentFcmToken"
  ADD CONSTRAINT "fk_parentfcmtoken_orangtua"
  FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE CASCADE;

-- Index for fast lookup by orang_tua_id
CREATE INDEX IF NOT EXISTS "idx_parentfcmtoken_orangtua" ON "ParentFcmToken" ("orang_tua_id");

