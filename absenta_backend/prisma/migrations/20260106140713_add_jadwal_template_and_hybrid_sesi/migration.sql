-- CreateEnum
CREATE TYPE "Hari" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU');

-- CreateEnum
CREATE TYPE "SumberSesi" AS ENUM ('TEMPLATE', 'MANUAL');

-- AlterTable
ALTER TABLE "SesiAbsensi" ADD COLUMN     "jadwal_template_id" TEXT,
ADD COLUMN     "sumber_sesi" "SumberSesi" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "JadwalTemplate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tahun_pelajaran_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "kelas_id" TEXT NOT NULL,
    "hari" "Hari" NOT NULL,
    "jam_mulai" TEXT NOT NULL,
    "jam_selesai" TEXT NOT NULL,
    "mapel_id" TEXT,
    "guru_id" TEXT,
    "jenis_kegiatan" TEXT NOT NULL DEFAULT 'KBM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "JadwalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JadwalTemplate_tenant_id_tahun_pelajaran_id_semester_id_idx" ON "JadwalTemplate"("tenant_id", "tahun_pelajaran_id", "semester_id");

-- CreateIndex
CREATE INDEX "JadwalTemplate_kelas_id_hari_idx" ON "JadwalTemplate"("kelas_id", "hari");

-- CreateIndex
CREATE INDEX "JadwalTemplate_guru_id_hari_idx" ON "JadwalTemplate"("guru_id", "hari");

-- CreateIndex
CREATE UNIQUE INDEX "JadwalTemplate_kelas_id_hari_jam_mulai_jam_selesai_key" ON "JadwalTemplate"("kelas_id", "hari", "jam_mulai", "jam_selesai");

-- CreateIndex
CREATE UNIQUE INDEX "JadwalTemplate_guru_id_hari_jam_mulai_jam_selesai_key" ON "JadwalTemplate"("guru_id", "hari", "jam_mulai", "jam_selesai");

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_jadwal_template_id_fkey" FOREIGN KEY ("jadwal_template_id") REFERENCES "JadwalTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalTemplate" ADD CONSTRAINT "JadwalTemplate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalTemplate" ADD CONSTRAINT "JadwalTemplate_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalTemplate" ADD CONSTRAINT "JadwalTemplate_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalTemplate" ADD CONSTRAINT "JadwalTemplate_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalTemplate" ADD CONSTRAINT "JadwalTemplate_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalTemplate" ADD CONSTRAINT "JadwalTemplate_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
