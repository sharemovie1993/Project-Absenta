-- CreateEnum
CREATE TYPE "RestoreStatus" AS ENUM ('NONE', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "TenantBackup" ADD COLUMN     "progress_table" TEXT,
ADD COLUMN     "restore_status" "RestoreStatus" NOT NULL DEFAULT 'NONE';
