-- AlterTable
ALTER TABLE "OrangTua" ADD COLUMN     "email" TEXT,
ADD COLUMN     "no_hp" TEXT;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "notification_throttle_seconds" INTEGER NOT NULL DEFAULT 30;
