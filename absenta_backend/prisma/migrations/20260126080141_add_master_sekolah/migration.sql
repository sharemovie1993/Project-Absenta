-- CreateTable
CREATE TABLE "MasterSekolah" (
    "id" TEXT NOT NULL,
    "npsn" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status_sekolah" TEXT,
    "bentuk_pendidikan" TEXT,
    "jenjang" TEXT,
    "akreditasi" TEXT,
    "alamat" TEXT,
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kota" TEXT,
    "provinsi" TEXT,
    "kode_pos" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "website" TEXT,
    "kepala_sekolah" TEXT,
    "nip_kepala" TEXT,
    "sumber_url" TEXT,
    "fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterSekolah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterSekolah_npsn_key" ON "MasterSekolah"("npsn");
