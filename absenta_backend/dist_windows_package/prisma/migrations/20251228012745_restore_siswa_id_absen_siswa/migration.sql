/*
  Warnings:

  - Added the required column `siswa_id` to the `AbsenSiswa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AbsenSiswa" ADD COLUMN     "siswa_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AbsenSiswa_siswa_id_idx" ON "AbsenSiswa"("siswa_id");

-- AddForeignKey
ALTER TABLE "AbsenSiswa" ADD CONSTRAINT "AbsenSiswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
