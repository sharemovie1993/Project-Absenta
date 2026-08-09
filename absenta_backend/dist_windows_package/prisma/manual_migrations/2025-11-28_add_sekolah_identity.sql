-- Safe additive migration: add missing identity columns to Sekolah without dropping data
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "npsn" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "nss" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "kode_sekolah" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "jenjang" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "akreditasi" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "alamat" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "kelurahan" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "kecamatan" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "kota" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "provinsi" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "kode_pos" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "telepon" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "kepala_sekolah" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "nip_kepala" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "tahun_berdiri" INTEGER;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Sekolah" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Note: unique constraints and indexes are intentionally omitted to avoid failures on existing data
