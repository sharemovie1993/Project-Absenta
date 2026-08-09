-- AlterTable
ALTER TABLE "SiswaStrukturOrganisasi" ADD COLUMN     "kelas_id" TEXT;

-- CreateIndex
CREATE INDEX "SiswaStrukturOrganisasi_kelas_id_idx" ON "SiswaStrukturOrganisasi"("kelas_id");

-- AddForeignKey
ALTER TABLE "SiswaStrukturOrganisasi" ADD CONSTRAINT "SiswaStrukturOrganisasi_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
