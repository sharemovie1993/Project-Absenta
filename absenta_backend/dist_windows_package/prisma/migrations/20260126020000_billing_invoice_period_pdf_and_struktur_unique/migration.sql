-- DropIndex
DROP INDEX "StrukturOrganisasi_tenant_id_kode_key";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "pdf_generated_at" TIMESTAMPTZ,
ADD COLUMN     "pdf_sha256" TEXT,
ADD COLUMN     "pdf_size_bytes" INTEGER,
ADD COLUMN     "pdf_storage_key" TEXT,
ADD COLUMN     "pdf_storage_provider" TEXT,
ADD COLUMN     "period_end" TIMESTAMPTZ,
ADD COLUMN     "period_start" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "StrukturOrganisasi_tenant_id_kode_kelas_id_key" ON "StrukturOrganisasi"("tenant_id", "kode", "kelas_id");
