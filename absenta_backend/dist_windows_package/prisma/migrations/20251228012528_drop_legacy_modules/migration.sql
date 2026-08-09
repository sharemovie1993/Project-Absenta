/*
  Warnings:

  - You are about to drop the column `siswa_id` on the `AbsenSiswa` table. All the data in the column will be lost.
  - You are about to drop the `LogTap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RekapAbsensiBulanan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SiswaKelasHistory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sesi_id,siswa_akademik_id]` on the table `AbsenSiswa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[event,related_id,recipient]` on the table `NotificationLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `semester_id` to the `AbsenGuru` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahun_pelajaran_id` to the `AbsenGuru` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siswa_akademik_id` to the `AbsenSiswa` table without a default value. This is not possible if the table is not empty.
  - Made the column `semester_id` on table `SesiAbsensi` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tahun_pelajaran_id` on table `SesiAbsensi` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AkademikStatus" AS ENUM ('AKTIF', 'NAIK', 'TINGGAL', 'LULUS', 'PINDAH');

-- DropForeignKey
ALTER TABLE "AbsenSiswa" DROP CONSTRAINT "AbsenSiswa_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "LogTap" DROP CONSTRAINT "LogTap_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "RekapAbsensiBulanan" DROP CONSTRAINT "RekapAbsensiBulanan_guru_id_fkey";

-- DropForeignKey
ALTER TABLE "RekapAbsensiBulanan" DROP CONSTRAINT "RekapAbsensiBulanan_kelas_id_fkey";

-- DropForeignKey
ALTER TABLE "RekapAbsensiBulanan" DROP CONSTRAINT "RekapAbsensiBulanan_mapel_id_fkey";

-- DropForeignKey
ALTER TABLE "RekapAbsensiBulanan" DROP CONSTRAINT "RekapAbsensiBulanan_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "SesiAbsensi" DROP CONSTRAINT "SesiAbsensi_semester_id_fkey";

-- DropForeignKey
ALTER TABLE "SesiAbsensi" DROP CONSTRAINT "SesiAbsensi_tahun_pelajaran_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaKelasHistory" DROP CONSTRAINT "SiswaKelasHistory_kelas_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaKelasHistory" DROP CONSTRAINT "SiswaKelasHistory_siswa_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaKelasHistory" DROP CONSTRAINT "SiswaKelasHistory_tahun_pelajaran_id_fkey";

-- DropForeignKey
ALTER TABLE "SiswaKelasHistory" DROP CONSTRAINT "SiswaKelasHistory_tenant_id_fkey";

-- DropIndex
DROP INDEX "AbsenSiswa_sesi_id_siswa_id_key";

-- DropIndex
DROP INDEX "AbsenSiswa_tenant_id_siswa_id_idx";

-- AlterTable
ALTER TABLE "AbsenGuru" ADD COLUMN     "semester_id" TEXT NOT NULL,
ADD COLUMN     "tahun_pelajaran_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AbsenSiswa" DROP COLUMN "siswa_id",
ADD COLUMN     "siswa_akademik_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "event" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "SesiAbsensi" ALTER COLUMN "semester_id" SET NOT NULL,
ALTER COLUMN "tahun_pelajaran_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "last_applied_invoice_id" TEXT;

-- DropTable
DROP TABLE "LogTap";

-- DropTable
DROP TABLE "RekapAbsensiBulanan";

-- DropTable
DROP TABLE "SiswaKelasHistory";

-- CreateTable
CREATE TABLE "SiswaAkademik" (
    "id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "tahun_pelajaran_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "status" "AkademikStatus" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "SiswaAkademik_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiswaAkademik_siswa_id_tahun_pelajaran_id_semester_id_key" ON "SiswaAkademik"("siswa_id", "tahun_pelajaran_id", "semester_id");

-- CreateIndex
CREATE INDEX "AbsenSiswa_siswa_akademik_id_idx" ON "AbsenSiswa"("siswa_akademik_id");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenSiswa_sesi_id_siswa_akademik_id_key" ON "AbsenSiswa"("sesi_id", "siswa_akademik_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_event_related_id_recipient_key" ON "NotificationLog"("event", "related_id", "recipient");

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaAkademik" ADD CONSTRAINT "SiswaAkademik_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGuru" ADD CONSTRAINT "AbsenGuru_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenGuru" ADD CONSTRAINT "AbsenGuru_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_siswa_akademik_id_fkey" FOREIGN KEY ("siswa_akademik_id") REFERENCES "SiswaAkademik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
