-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "default_attendance_email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "default_attendance_wa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "default_late_threshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "default_notap_threshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "default_parent_email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "default_parent_wa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "digest_time_daily" TEXT DEFAULT '06:00',
ADD COLUMN     "digest_time_weekly" TEXT DEFAULT '18:00',
ADD COLUMN     "digest_weekly_day" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quiet_hours_end" TEXT DEFAULT '06:00',
ADD COLUMN     "quiet_hours_start" TEXT DEFAULT '22:00';
