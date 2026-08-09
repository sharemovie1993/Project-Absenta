-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "price_snapshot" INTEGER,
ADD COLUMN     "pricing_meta" JSONB,
ADD COLUMN     "pricing_model" TEXT;
