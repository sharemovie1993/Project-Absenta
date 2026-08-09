/*
  Warnings:

  - The values [GERBANG,APEL,DUHA,UPACARA,JURUSAN] on the enum `JenisKegiatan` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `PetugasAbsensi` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JenisKegiatan_new" AS ENUM ('PEMBIASAAN', 'KBM', 'ESKUL');
ALTER TABLE "SesiGerbang" ALTER COLUMN "jenis_kegiatan" DROP DEFAULT;
ALTER TABLE "SesiGerbang" ALTER COLUMN "jenis_kegiatan" TYPE "JenisKegiatan_new" USING ("jenis_kegiatan"::text::"JenisKegiatan_new");
ALTER TABLE "JenisKegiatanMaster" ALTER COLUMN "tipe" TYPE "JenisKegiatan_new" USING ("tipe"::text::"JenisKegiatan_new");
ALTER TYPE "JenisKegiatan" RENAME TO "JenisKegiatan_old";
ALTER TYPE "JenisKegiatan_new" RENAME TO "JenisKegiatan";
DROP TYPE "JenisKegiatan_old";
ALTER TABLE "SesiGerbang" ALTER COLUMN "jenis_kegiatan" SET DEFAULT 'PEMBIASAAN';
COMMIT;

-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_guru_id_fkey";

-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_kelas_id_fkey";

-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_tenant_id_fkey";

-- AlterTable
ALTER TABLE "SesiGerbang" ALTER COLUMN "jenis_kegiatan" SET DEFAULT 'PEMBIASAAN';

-- AlterTable
ALTER TABLE "StrukturOrganisasi" ADD COLUMN     "kelas_id" TEXT;

-- DropTable
DROP TABLE "PetugasAbsensi";

-- CreateTable
CREATE TABLE "JenisPelanggaran" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "nama_pelanggaran" TEXT NOT NULL,
    "poin" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JenisPelanggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PelanggaranSiswa" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jenis_pelanggaran" TEXT NOT NULL,
    "poin" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'BARU',
    "keterangan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PelanggaranSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisiGuru" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "supervisor_id" TEXT,
    "tanggal" DATE NOT NULL,
    "mapel" TEXT,
    "kelas" TEXT,
    "jam_ke" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "catatan" TEXT,
    "nilai" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisiGuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiswaStrukturOrganisasi" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "struktur_organisasi_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiswaStrukturOrganisasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JenisPelanggaran_tenant_id_idx" ON "JenisPelanggaran"("tenant_id");

-- CreateIndex
CREATE INDEX "PelanggaranSiswa_tenant_id_idx" ON "PelanggaranSiswa"("tenant_id");

-- CreateIndex
CREATE INDEX "PelanggaranSiswa_siswa_id_idx" ON "PelanggaranSiswa"("siswa_id");

-- CreateIndex
CREATE INDEX "PelanggaranSiswa_tanggal_idx" ON "PelanggaranSiswa"("tanggal");

-- CreateIndex
CREATE INDEX "SupervisiGuru_tenant_id_idx" ON "SupervisiGuru"("tenant_id");

-- CreateIndex
CREATE INDEX "SupervisiGuru_guru_id_idx" ON "SupervisiGuru"("guru_id");

-- CreateIndex
CREATE INDEX "SupervisiGuru_tanggal_idx" ON "SupervisiGuru"("tanggal");

-- CreateIndex
CREATE INDEX "SiswaStrukturOrganisasi_tenant_id_idx" ON "SiswaStrukturOrganisasi"("tenant_id");

-- CreateIndex
CREATE INDEX "SiswaStrukturOrganisasi_siswa_id_idx" ON "SiswaStrukturOrganisasi"("siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiswaStrukturOrganisasi_siswa_id_struktur_organisasi_id_key" ON "SiswaStrukturOrganisasi"("siswa_id", "struktur_organisasi_id");

-- CreateIndex
CREATE INDEX "StrukturOrganisasi_kelas_id_idx" ON "StrukturOrganisasi"("kelas_id");

-- AddForeignKey
ALTER TABLE "JenisPelanggaran" ADD CONSTRAINT "JenisPelanggaran_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PelanggaranSiswa" ADD CONSTRAINT "PelanggaranSiswa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PelanggaranSiswa" ADD CONSTRAINT "PelanggaranSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisiGuru" ADD CONSTRAINT "SupervisiGuru_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisiGuru" ADD CONSTRAINT "SupervisiGuru_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisiGuru" ADD CONSTRAINT "SupervisiGuru_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukturOrganisasi" ADD CONSTRAINT "StrukturOrganisasi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_struktur_organisasi_id_fkey" FOREIGN KEY ("struktur_organisasi_id") REFERENCES "StrukturOrganisasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
