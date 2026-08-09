-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('READY', 'RESTORED', 'PURGED');

-- CreateTable
CREATE TABLE "TenantBackup" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "snapshot_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_path" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'READY',
    "restored_at" TIMESTAMP(3),
    "restored_to_tenant_id" TEXT,

    CONSTRAINT "TenantBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantBackup_tenant_id_idx" ON "TenantBackup"("tenant_id");

-- CreateIndex
CREATE INDEX "TenantBackup_expires_at_idx" ON "TenantBackup"("expires_at");

-- AddForeignKey
ALTER TABLE "TenantBackup" ADD CONSTRAINT "TenantBackup_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
