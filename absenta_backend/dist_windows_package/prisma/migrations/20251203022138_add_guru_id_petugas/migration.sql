/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,kelas_id,guru_id,is_active]` on the table `PetugasAbsensi` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PetugasAbsensi" ADD COLUMN     "guru_id" TEXT;

-- CreateIndex
CREATE INDEX "PetugasAbsensi_tenant_id_guru_id_idx" ON "PetugasAbsensi"("tenant_id", "guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "PetugasAbsensi_tenant_id_kelas_id_guru_id_is_active_key" ON "PetugasAbsensi"("tenant_id", "kelas_id", "guru_id", "is_active");

-- AddForeignKey
ALTER TABLE "PetugasAbsensi" ADD CONSTRAINT "PetugasAbsensi_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
