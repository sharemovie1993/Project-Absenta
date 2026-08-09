/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,kelas_id,tahun_pelajaran_id]` on the table `WaliKelas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tahun_pelajaran_id` to the `WaliKelas` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WaliKelas_kelas_id_key";

-- AlterTable
ALTER TABLE "SesiAbsensi" ADD COLUMN     "created_by_user_id" TEXT;

-- AlterTable
ALTER TABLE "WaliKelas" ADD COLUMN     "tahun_pelajaran_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SiswaKelasHistory" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "tahun_pelajaran_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiswaKelasHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetugasAbsensi" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetugasAbsensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiswaKelasHistory_tenant_id_idx" ON "SiswaKelasHistory"("tenant_id");

-- CreateIndex
CREATE INDEX "SiswaKelasHistory_siswa_id_idx" ON "SiswaKelasHistory"("siswa_id");

-- CreateIndex
CREATE INDEX "SiswaKelasHistory_kelas_id_idx" ON "SiswaKelasHistory"("kelas_id");

-- CreateIndex
CREATE INDEX "SiswaKelasHistory_tahun_pelajaran_id_idx" ON "SiswaKelasHistory"("tahun_pelajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiswaKelasHistory_tenant_id_siswa_id_tahun_pelajaran_id_key" ON "SiswaKelasHistory"("tenant_id", "siswa_id", "tahun_pelajaran_id");

-- CreateIndex
CREATE INDEX "PetugasAbsensi_tenant_id_idx" ON "PetugasAbsensi"("tenant_id");

-- CreateIndex
CREATE INDEX "PetugasAbsensi_tenant_id_kelas_id_idx" ON "PetugasAbsensi"("tenant_id", "kelas_id");

-- CreateIndex
CREATE INDEX "PetugasAbsensi_tenant_id_siswa_id_idx" ON "PetugasAbsensi"("tenant_id", "siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "PetugasAbsensi_tenant_id_kelas_id_siswa_id_is_active_key" ON "PetugasAbsensi"("tenant_id", "kelas_id", "siswa_id", "is_active");

-- CreateIndex
CREATE INDEX "SesiAbsensi_tenant_id_created_by_user_id_idx" ON "SesiAbsensi"("tenant_id", "created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "WaliKelas_tenant_id_kelas_id_tahun_pelajaran_id_key" ON "WaliKelas"("tenant_id", "kelas_id", "tahun_pelajaran_id");

-- AddForeignKey
ALTER TABLE "WaliKelas" ADD CONSTRAINT "WaliKelas_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelasHistory" ADD CONSTRAINT "SiswaKelasHistory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelasHistory" ADD CONSTRAINT "SiswaKelasHistory_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelasHistory" ADD CONSTRAINT "SiswaKelasHistory_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKelasHistory" ADD CONSTRAINT "SiswaKelasHistory_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
