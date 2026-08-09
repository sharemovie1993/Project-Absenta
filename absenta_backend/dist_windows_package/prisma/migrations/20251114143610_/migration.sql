-- AlterTable
ALTER TABLE "AbsenGerbangSiswa" ADD COLUMN     "kelas_id_snapshot" TEXT,
ADD COLUMN     "kelas_nama_snapshot" TEXT,
ADD COLUMN     "tahun_pelajaran_id_snapshot" TEXT,
ADD COLUMN     "tingkat_snapshot" INTEGER;

-- AlterTable
ALTER TABLE "AbsenSiswa" ADD COLUMN     "kelas_id_snapshot" TEXT,
ADD COLUMN     "kelas_nama_snapshot" TEXT,
ADD COLUMN     "tahun_pelajaran_id_snapshot" TEXT,
ADD COLUMN     "tingkat_snapshot" INTEGER;

-- AlterTable
ALTER TABLE "SesiAbsensi" ADD COLUMN     "tahun_pelajaran_id" TEXT;

-- AlterTable
ALTER TABLE "SesiGerbang" ADD COLUMN     "tahun_pelajaran_id" TEXT;

-- CreateIndex
CREATE INDEX "AbsenGerbangSiswa_tenant_id_tahun_pelajaran_id_snapshot_idx" ON "AbsenGerbangSiswa"("tenant_id", "tahun_pelajaran_id_snapshot");

-- CreateIndex
CREATE INDEX "SesiAbsensi_tenant_id_tahun_pelajaran_id_idx" ON "SesiAbsensi"("tenant_id", "tahun_pelajaran_id");

-- CreateIndex
CREATE INDEX "SesiGerbang_tenant_id_tahun_pelajaran_id_idx" ON "SesiGerbang"("tenant_id", "tahun_pelajaran_id");

-- AddForeignKey
ALTER TABLE "SesiAbsensi" ADD CONSTRAINT "SesiAbsensi_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesiGerbang" ADD CONSTRAINT "SesiGerbang_tahun_pelajaran_id_fkey" FOREIGN KEY ("tahun_pelajaran_id") REFERENCES "TahunPelajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
