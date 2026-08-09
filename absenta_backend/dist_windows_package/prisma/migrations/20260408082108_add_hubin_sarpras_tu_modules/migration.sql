/*
  Warnings:

  - You are about to drop the `AbsenGerbangSiswa_old` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AbsenSiswa_old` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sesi_gerbang_id,siswa_id,arah]` on the table `AbsenGerbangSiswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sesi_id,siswa_akademik_id]` on the table `AbsenSiswa` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "AbsenGerbangSiswa_old" DROP CONSTRAINT "AbsenGerbangSiswa_sesi_gerbang_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenGerbangSiswa_old" DROP CONSTRAINT "AbsenGerbangSiswa_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenGerbangSiswa_old" DROP CONSTRAINT "AbsenGerbangSiswa_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenSiswa_old" DROP CONSTRAINT "AbsenSiswa_sesi_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenSiswa_old" DROP CONSTRAINT "AbsenSiswa_siswa_akademik_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenSiswa_old" DROP CONSTRAINT "AbsenSiswa_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsenSiswa_old" DROP CONSTRAINT "AbsenSiswa_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationalAssignment" DROP CONSTRAINT "OrganizationalAssignment_kelas_id_fkey";

-- DropForeignKey
ALTER TABLE "PlanChangeRequest" DROP CONSTRAINT "PlanChangeRequest_to_plan_id_fkey";

-- AlterTable
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_pkey" PRIMARY KEY ("id", "created_at");

-- AlterTable
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_pkey" PRIMARY KEY ("id", "created_at");

-- AlterTable
ALTER TABLE "Addon" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SubscriptionAddon" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "AbsenGerbangSiswa_old";

-- DropTable
DROP TABLE "AbsenSiswa_old";

-- CreateTable
CREATE TABLE "MitraIndustri" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "bidang" TEXT,
    "alamat" TEXT,
    "kontak" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MitraIndustri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiswaPkl" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "mitra_id" TEXT NOT NULL,
    "tanggal_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_selesai" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "pembimbing_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiswaPkl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SarprasAsset" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "kategori" TEXT,
    "kondisi" TEXT NOT NULL DEFAULT 'BAIK',
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "lokasi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SarprasAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SarprasLoan" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "peminjam_id" TEXT NOT NULL,
    "tanggal_pinjam" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_kembali" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DIPINJAM',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SarprasLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratMasuk" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "asal_surat" TEXT,
    "tanggal_surat" TIMESTAMP(3) NOT NULL,
    "tanggal_terima" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dokumen_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratMasuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratKeluar" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "tujuan_surat" TEXT,
    "tanggal_surat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dokumen_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratKeluar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MitraIndustri_tenant_id_idx" ON "MitraIndustri"("tenant_id");

-- CreateIndex
CREATE INDEX "SiswaPkl_tenant_id_idx" ON "SiswaPkl"("tenant_id");

-- CreateIndex
CREATE INDEX "SiswaPkl_siswa_id_idx" ON "SiswaPkl"("siswa_id");

-- CreateIndex
CREATE INDEX "SiswaPkl_mitra_id_idx" ON "SiswaPkl"("mitra_id");

-- CreateIndex
CREATE INDEX "SarprasAsset_tenant_id_idx" ON "SarprasAsset"("tenant_id");

-- CreateIndex
CREATE INDEX "SarprasLoan_tenant_id_idx" ON "SarprasLoan"("tenant_id");

-- CreateIndex
CREATE INDEX "SarprasLoan_asset_id_idx" ON "SarprasLoan"("asset_id");

-- CreateIndex
CREATE INDEX "SarprasLoan_peminjam_id_idx" ON "SarprasLoan"("peminjam_id");

-- CreateIndex
CREATE INDEX "SuratMasuk_tenant_id_idx" ON "SuratMasuk"("tenant_id");

-- CreateIndex
CREATE INDEX "SuratKeluar_tenant_id_idx" ON "SuratKeluar"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenGerbangSiswa_sesi_gerbang_id_siswa_id_arah_key" ON "AbsenGerbangSiswa"("sesi_gerbang_id", "siswa_id", "arah");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenSiswa_sesi_id_siswa_akademik_id_key" ON "AbsenSiswa"("sesi_id", "siswa_akademik_id");

-- AddForeignKey
ALTER TABLE "OrganizationalAssignment" ADD CONSTRAINT "OrganizationalAssignment_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_sesi_id_fkey" FOREIGN KEY ("sesi_id") REFERENCES "SesiAbsensi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_siswa_akademik_id_fkey" FOREIGN KEY ("siswa_akademik_id") REFERENCES "SiswaAkademik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_sesi_gerbang_id_fkey" FOREIGN KEY ("sesi_gerbang_id") REFERENCES "SesiGerbang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGerbangSiswa" ADD CONSTRAINT "AbsenGerbangSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeRequest" ADD CONSTRAINT "PlanChangeRequest_to_plan_id_fkey" FOREIGN KEY ("to_plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MitraIndustri" ADD CONSTRAINT "MitraIndustri_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaPkl" ADD CONSTRAINT "SiswaPkl_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaPkl" ADD CONSTRAINT "SiswaPkl_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaPkl" ADD CONSTRAINT "SiswaPkl_mitra_id_fkey" FOREIGN KEY ("mitra_id") REFERENCES "MitraIndustri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaPkl" ADD CONSTRAINT "SiswaPkl_pembimbing_id_fkey" FOREIGN KEY ("pembimbing_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SarprasAsset" ADD CONSTRAINT "SarprasAsset_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SarprasLoan" ADD CONSTRAINT "SarprasLoan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SarprasLoan" ADD CONSTRAINT "SarprasLoan_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "SarprasAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SarprasLoan" ADD CONSTRAINT "SarprasLoan_peminjam_id_fkey" FOREIGN KEY ("peminjam_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratMasuk" ADD CONSTRAINT "SuratMasuk_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuratKeluar" ADD CONSTRAINT "SuratKeluar_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "AbsenGerbangSiswa_new_tenant_created_at_idx" RENAME TO "AbsenGerbangSiswa_tenant_id_created_at_idx";

-- RenameIndex
ALTER INDEX "AbsenGerbangSiswa_new_tenant_id_idx" RENAME TO "AbsenGerbangSiswa_tenant_id_idx";

-- RenameIndex
ALTER INDEX "AbsenGerbangSiswa_new_tenant_sesi_siswa_arah_idx" RENAME TO "AbsenGerbangSiswa_tenant_id_sesi_gerbang_id_siswa_id_arah_idx";

-- RenameIndex
ALTER INDEX "AbsenGerbangSiswa_new_tenant_siswa_arah_idx" RENAME TO "AbsenGerbangSiswa_tenant_id_siswa_id_arah_idx";

-- RenameIndex
ALTER INDEX "AbsenGerbangSiswa_new_tenant_tahun_snapshot_idx" RENAME TO "AbsenGerbangSiswa_tenant_id_tahun_pelajaran_id_snapshot_idx";

-- RenameIndex
ALTER INDEX "AbsenSiswa_new_siswa_akademik_id_idx" RENAME TO "AbsenSiswa_siswa_akademik_id_idx";

-- RenameIndex
ALTER INDEX "AbsenSiswa_new_siswa_id_idx" RENAME TO "AbsenSiswa_siswa_id_idx";

-- RenameIndex
ALTER INDEX "AbsenSiswa_new_tenant_created_at_idx" RENAME TO "AbsenSiswa_tenant_id_created_at_idx";

-- RenameIndex
ALTER INDEX "AbsenSiswa_new_tenant_id_idx" RENAME TO "AbsenSiswa_tenant_id_idx";

-- RenameIndex
ALTER INDEX "AbsenSiswa_new_tenant_sesi_siswaakademik_idx" RENAME TO "AbsenSiswa_tenant_id_sesi_id_siswa_akademik_id_idx";
