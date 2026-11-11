-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TeachingMode" AS ENUM ('SINGLE', 'COLLABORATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropIndex (Allow multi-unit parallel schedules under 1 official SK guru_id when taught by different unit/delegation teachers)
DROP INDEX IF EXISTS "JadwalKBM_guru_id_tahun_pelajaran_id_semester_id_hari_jam_m_key";

-- AlterTable
ALTER TABLE "CbtBankSoal"
    ADD COLUMN IF NOT EXISTS "semester_id" TEXT,
    ADD COLUMN IF NOT EXISTS "tahun_pelajaran_id" TEXT,
    ADD COLUMN IF NOT EXISTS "unit_pengajaran_id" TEXT;

ALTER TABLE "CbtSoal"
    ADD COLUMN IF NOT EXISTS "unit_pengajaran_id" TEXT;

ALTER TABLE "GuruMapel"
    ADD COLUMN IF NOT EXISTS "teaching_mode" "TeachingMode" NOT NULL DEFAULT 'SINGLE';

ALTER TABLE "JadwalKBM"
    ADD COLUMN IF NOT EXISTS "unit_pengajaran_id" TEXT;

ALTER TABLE "JadwalKontrakKbm"
    ADD COLUMN IF NOT EXISTS "guru_pelaksana_id" TEXT,
    ADD COLUMN IF NOT EXISTS "unit_pengajaran_id" TEXT;

ALTER TABLE "NilaiSiswa"
    ADD COLUMN IF NOT EXISTS "sumatif_4" DOUBLE PRECISION;

ALTER TABLE "SesiAbsensi"
    ADD COLUMN IF NOT EXISTS "unit_pengajaran_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UnitPengajaran" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tahun_pelajaran_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "guru_mapel_id" TEXT NOT NULL,
    "mapel_id" TEXT NOT NULL,
    "kelas_id" TEXT,
    "jurusan_id" TEXT,
    "nama_unit" TEXT,
    "guru_id" TEXT NOT NULL,
    "jp_alokasi" INTEGER NOT NULL DEFAULT 2,
    "target_sumatif_slot" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitPengajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CbtBankSoalKontributor" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bank_soal_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "unit_pengajaran_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CbtBankSoalKontributor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UnitPengajaran_tenant_id_idx" ON "UnitPengajaran"("tenant_id");
CREATE INDEX IF NOT EXISTS "UnitPengajaran_tenant_id_tahun_pelajaran_id_semester_id_idx" ON "UnitPengajaran"("tenant_id", "tahun_pelajaran_id", "semester_id");
CREATE INDEX IF NOT EXISTS "UnitPengajaran_tenant_id_tahun_pelajaran_id_semester_id_map_idx" ON "UnitPengajaran"("tenant_id", "tahun_pelajaran_id", "semester_id", "mapel_id");
CREATE INDEX IF NOT EXISTS "UnitPengajaran_guru_mapel_id_idx" ON "UnitPengajaran"("guru_mapel_id");
CREATE INDEX IF NOT EXISTS "UnitPengajaran_guru_id_idx" ON "UnitPengajaran"("guru_id");
CREATE INDEX IF NOT EXISTS "UnitPengajaran_kelas_id_idx" ON "UnitPengajaran"("kelas_id");

CREATE INDEX IF NOT EXISTS "CbtBankSoalKontributor_tenant_id_idx" ON "CbtBankSoalKontributor"("tenant_id");
CREATE INDEX IF NOT EXISTS "CbtBankSoalKontributor_guru_id_idx" ON "CbtBankSoalKontributor"("guru_id");
CREATE UNIQUE INDEX IF NOT EXISTS "CbtBankSoalKontributor_bank_soal_id_guru_id_key" ON "CbtBankSoalKontributor"("bank_soal_id", "guru_id");

CREATE INDEX IF NOT EXISTS "CbtBankSoal_tenant_id_tahun_pelajaran_id_semester_id_idx" ON "CbtBankSoal"("tenant_id", "tahun_pelajaran_id", "semester_id");
CREATE INDEX IF NOT EXISTS "CbtBankSoal_unit_pengajaran_id_idx" ON "CbtBankSoal"("unit_pengajaran_id");
CREATE INDEX IF NOT EXISTS "CbtSoal_unit_pengajaran_id_idx" ON "CbtSoal"("unit_pengajaran_id");
CREATE INDEX IF NOT EXISTS "JadwalKBM_unit_pengajaran_id_idx" ON "JadwalKBM"("unit_pengajaran_id");
CREATE INDEX IF NOT EXISTS "JadwalKontrakKbm_unit_pengajaran_id_idx" ON "JadwalKontrakKbm"("unit_pengajaran_id");
CREATE INDEX IF NOT EXISTS "SesiAbsensi_unit_pengajaran_id_idx" ON "SesiAbsensi"("unit_pengajaran_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_unit_pengajaran_id_fkey" FOREIGN KEY ("unit_pengajaran_id") REFERENCES "UnitPengajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_guru_mapel_id_fkey" FOREIGN KEY ("guru_mapel_id") REFERENCES "GuruMapel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UnitPengajaran" ADD CONSTRAINT "UnitPengajaran_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "JadwalKBM" ADD CONSTRAINT "JadwalKBM_unit_pengajaran_id_fkey" FOREIGN KEY ("unit_pengajaran_id") REFERENCES "UnitPengajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "JadwalKontrakKbm" ADD CONSTRAINT "JadwalKontrakKbm_unit_pengajaran_id_fkey" FOREIGN KEY ("unit_pengajaran_id") REFERENCES "UnitPengajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "JadwalKontrakKbm" ADD CONSTRAINT "JadwalKontrakKbm_guru_pelaksana_id_fkey" FOREIGN KEY ("guru_pelaksana_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoal" ADD CONSTRAINT "CbtBankSoal_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoal" ADD CONSTRAINT "CbtBankSoal_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoal" ADD CONSTRAINT "CbtBankSoal_unit_pengajaran_id_fkey" FOREIGN KEY ("unit_pengajaran_id") REFERENCES "UnitPengajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoalKontributor" ADD CONSTRAINT "CbtBankSoalKontributor_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoalKontributor" ADD CONSTRAINT "CbtBankSoalKontributor_bank_soal_id_fkey" FOREIGN KEY ("bank_soal_id") REFERENCES "CbtBankSoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoalKontributor" ADD CONSTRAINT "CbtBankSoalKontributor_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtBankSoalKontributor" ADD CONSTRAINT "CbtBankSoalKontributor_unit_pengajaran_id_fkey" FOREIGN KEY ("unit_pengajaran_id") REFERENCES "UnitPengajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CbtSoal" ADD CONSTRAINT "CbtSoal_unit_pengajaran_id_fkey" FOREIGN KEY ("unit_pengajaran_id") REFERENCES "UnitPengajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
