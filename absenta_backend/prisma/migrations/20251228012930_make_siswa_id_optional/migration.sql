-- DropForeignKey
ALTER TABLE "AbsenSiswa" DROP CONSTRAINT "AbsenSiswa_siswa_id_fkey";

-- AlterTable
ALTER TABLE "AbsenSiswa" ALTER COLUMN "siswa_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
