/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,guru_id,is_active]` on the table `PetugasAbsensi` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PetugasAbsensi" DROP CONSTRAINT "PetugasAbsensi_kelas_id_fkey";

-- DropIndex
DROP INDEX "PetugasAbsensi_tenant_id_kelas_id_guru_id_is_active_key";

-- AlterTable
ALTER TABLE "PetugasAbsensi" ALTER COLUMN "kelas_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PetugasAbsensi_tenant_id_guru_id_is_active_key" ON "PetugasAbsensi"("tenant_id", "guru_id", "is_active");

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
