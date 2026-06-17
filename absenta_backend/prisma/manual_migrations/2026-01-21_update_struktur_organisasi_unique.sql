DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StrukturOrganisasi_tenant_id_kode_key'
  ) THEN
    ALTER TABLE "StrukturOrganisasi" DROP CONSTRAINT "StrukturOrganisasi_tenant_id_kode_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'StrukturOrganisasi_tenant_id_kode_key'
  ) THEN
    DROP INDEX "StrukturOrganisasi_tenant_id_kode_key";
  END IF;
END $$;

ALTER TABLE "StrukturOrganisasi"
ADD CONSTRAINT "StrukturOrganisasi_tenant_id_kode_kelas_id_key"
UNIQUE ("tenant_id", "kode", "kelas_id");

