-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_siswa_id_fkey";

-- AlterTable
ALTER TABLE "PetugasAbsensi" ALTER COLUMN "siswa_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
