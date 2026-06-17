-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "expired_reason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false;
