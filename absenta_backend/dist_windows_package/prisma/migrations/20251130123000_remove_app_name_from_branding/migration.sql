-- AlterEnum
ALTER TYPE "PaymentGateway" ADD VALUE 'TRIPAY';

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'TRIAL', 'PENDING_PAYMENT');
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "SubscriptionStatus_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Branding" DROP COLUMN "app_name",
DROP COLUMN "theme_mode";

-- AlterTable
ALTER TABLE "Sekolah" ADD COLUMN     "akreditasi" TEXT,
ADD COLUMN     "alamat" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "jenjang" TEXT,
ADD COLUMN     "kecamatan" TEXT,
ADD COLUMN     "kelurahan" TEXT,
ADD COLUMN     "kepala_sekolah" TEXT,
ADD COLUMN     "kode_pos" TEXT,
ADD COLUMN     "kode_sekolah" TEXT,
ADD COLUMN     "kota" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "nip_kepala" TEXT,
ADD COLUMN     "npsn" TEXT,
ADD COLUMN     "nss" TEXT,
ADD COLUMN     "provinsi" TEXT,
ADD COLUMN     "tahun_berdiri" INTEGER,
ADD COLUMN     "telepon" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sekolah_tenant_id_npsn_key" ON "Sekolah"("tenant_id", "npsn");
