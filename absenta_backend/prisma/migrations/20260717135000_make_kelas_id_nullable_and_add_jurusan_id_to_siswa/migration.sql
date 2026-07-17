-- DropForeignKey
ALTER TABLE "Siswa" DROP CONSTRAINT "Siswa_kelas_id_fkey";

-- AlterTable
ALTER TABLE "Siswa" ADD COLUMN     "jurusan_id" TEXT,
ALTER COLUMN "kelas_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_jurusan_id_fkey" FOREIGN KEY ("jurusan_id") REFERENCES "Jurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
