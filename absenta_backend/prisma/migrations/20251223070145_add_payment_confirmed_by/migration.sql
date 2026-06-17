-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "confirmed_by" TEXT,
ADD COLUMN     "is_first_success" BOOLEAN NOT NULL DEFAULT false;
