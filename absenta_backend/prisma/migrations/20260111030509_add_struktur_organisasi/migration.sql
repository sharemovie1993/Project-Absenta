-- CreateTable
CREATE TABLE "StrukturOrganisasi" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "scope" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrukturOrganisasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuruStrukturOrganisasi" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "guru_id" TEXT NOT NULL,
    "struktur_organisasi_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuruStrukturOrganisasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrukturOrganisasi_tenant_id_idx" ON "StrukturOrganisasi"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "StrukturOrganisasi_tenant_id_kode_key" ON "StrukturOrganisasi"("tenant_id", "kode");

-- CreateIndex
CREATE INDEX "GuruStrukturOrganisasi_tenant_id_idx" ON "GuruStrukturOrganisasi"("tenant_id");

-- CreateIndex
CREATE INDEX "GuruStrukturOrganisasi_guru_id_idx" ON "GuruStrukturOrganisasi"("guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "GuruStrukturOrganisasi_guru_id_struktur_organisasi_id_key" ON "GuruStrukturOrganisasi"("guru_id", "struktur_organisasi_id");

-- AddForeignKey
ALTER TABLE "StrukturOrganisasi" ADD CONSTRAINT "StrukturOrganisasi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruStrukturOrganisasi" ADD CONSTRAINT "GuruStrukturOrganisasi_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruStrukturOrganisasi" ADD CONSTRAINT "GuruStrukturOrganisasi_struktur_organisasi_id_fkey" FOREIGN KEY ("struktur_organisasi_id") REFERENCES "StrukturOrganisasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuruStrukturOrganisasi" ADD CONSTRAINT "GuruStrukturOrganisasi_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
