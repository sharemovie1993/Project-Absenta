/*
  Warnings:

  - You are about to drop the column `siswa_id` on the `OrangTua` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[kelas_id,tahun_pelajaran_id,semester_id,hari,jam_mulai,jam_selesai]` on the table `JadwalTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[guru_id,tahun_pelajaran_id,semester_id,hari,jam_mulai,jam_selesai]` on the table `JadwalTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `OrangTua` table without a default value. This is not possible if the table is not empty.

*/

-- DropForeignKey
ALTER TABLE "OrangTua" DROP CONSTRAINT "OrangTua_siswa_id_fkey";

-- DropIndex (JadwalTemplate related)
DROP INDEX IF EXISTS "JadwalTemplate_guru_id_hari_jam_mulai_jam_selesai_key";
DROP INDEX IF EXISTS "JadwalTemplate_kelas_id_hari_jam_mulai_jam_selesai_key";

-- CreateTable
CREATE TABLE "OrangTuaSiswa" (
    "id" TEXT NOT NULL,
    "orang_tua_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,

    CONSTRAINT "OrangTuaSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentAccessToken" (
    "id" TEXT NOT NULL,
    "orang_tua_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentAccessToken_pkey" PRIMARY KEY ("id")
);

-- DATA MIGRATION START

-- 1. Insert records for Parents WITH phone numbers (Deduplicating)
INSERT INTO "OrangTuaSiswa" (id, orang_tua_id, siswa_id)
SELECT 
  gen_random_uuid(),
  first_value(id) OVER (PARTITION BY no_hp ORDER BY created_at ASC) as orang_tua_id,
  siswa_id
FROM "OrangTua"
WHERE no_hp IS NOT NULL AND no_hp != '';

-- 2. Insert records for Parents WITHOUT phone numbers (Keep as is)
INSERT INTO "OrangTuaSiswa" (id, orang_tua_id, siswa_id)
SELECT 
  gen_random_uuid(),
  id,
  siswa_id
FROM "OrangTua"
WHERE no_hp IS NULL OR no_hp = '';

-- 3. Delete Duplicate Parents (Keep only the first one per no_hp)
DELETE FROM "OrangTua"
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      row_number() OVER (PARTITION BY no_hp ORDER BY created_at ASC) as rn
    FROM "OrangTua"
    WHERE no_hp IS NOT NULL AND no_hp != ''
  ) t
  WHERE rn > 1
);

-- DATA MIGRATION END

-- AlterTable
ALTER TABLE "OrangTua" DROP COLUMN "siswa_id",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "OrangTuaSiswa_orang_tua_id_idx" ON "OrangTuaSiswa"("orang_tua_id");

-- CreateIndex
CREATE INDEX "OrangTuaSiswa_siswa_id_idx" ON "OrangTuaSiswa"("siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrangTuaSiswa_orang_tua_id_siswa_id_key" ON "OrangTuaSiswa"("orang_tua_id", "siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "ParentAccessToken_token_key" ON "ParentAccessToken"("token");

-- CreateIndex
CREATE INDEX "ParentAccessToken_orang_tua_id_idx" ON "ParentAccessToken"("orang_tua_id");

-- CreateIndex
CREATE UNIQUE INDEX "JadwalTemplate_kelas_id_tahun_pelajaran_id_semester_id_hari_key" ON "JadwalTemplate"("kelas_id", "tahun_pelajaran_id", "semester_id", "hari", "jam_mulai", "jam_selesai");

-- CreateIndex
CREATE UNIQUE INDEX "JadwalTemplate_guru_id_tahun_pelajaran_id_semester_id_hari__key" ON "JadwalTemplate"("guru_id", "tahun_pelajaran_id", "semester_id", "hari", "jam_mulai", "jam_selesai");

-- AddForeignKey
ALTER TABLE "OrangTuaSiswa" ADD CONSTRAINT "OrangTuaSiswa_orang_tua_id_fkey" FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrangTuaSiswa" ADD CONSTRAINT "OrangTuaSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAccessToken" ADD CONSTRAINT "ParentAccessToken_orang_tua_id_fkey" FOREIGN KEY ("orang_tua_id") REFERENCES "OrangTua"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
