-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "jam_masuk_default" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "jam_pulang_default" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "toleransi_keterlambatan_menit" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "Kelas" ADD COLUMN     "jam_masuk" TEXT,
ADD COLUMN     "jam_pulang" TEXT;

-- CreateTable
CREATE TABLE "absensi_kejadian_khusus" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "keterangan" TEXT NOT NULL,
    "abaikan_terlambat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_kejadian_khusus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "absensi_kejadian_khusus_tenant_id_tanggal_key" ON "absensi_kejadian_khusus"("tenant_id", "tanggal");

-- AddForeignKey
ALTER TABLE "absensi_kejadian_khusus" ADD CONSTRAINT "absensi_kejadian_khusus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
