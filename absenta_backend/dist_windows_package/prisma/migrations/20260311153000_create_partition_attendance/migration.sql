BEGIN;

CREATE TABLE IF NOT EXISTS "AbsenGerbangSiswa_new"
(LIKE "AbsenGerbangSiswa" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS)
PARTITION BY RANGE ("created_at");

CREATE TABLE IF NOT EXISTS "AbsenSiswa_new"
(LIKE "AbsenSiswa" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS)
PARTITION BY RANGE ("created_at");

CREATE OR REPLACE FUNCTION absenta_create_monthly_partitions(
  parent_table regclass,
  table_prefix text,
  start_month date,
  months_ahead int
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  i int;
  from_date date;
  to_date date;
  part_name text;
BEGIN
  FOR i IN 0..months_ahead-1 LOOP
    from_date := (date_trunc('month', start_month)::date + (i || ' month')::interval)::date;
    to_date := (date_trunc('month', start_month)::date + ((i + 1) || ' month')::interval)::date;
    part_name := format('%s_%s', table_prefix, to_char(from_date, 'YYYY_MM'));
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L);',
      part_name, parent_table, from_date, to_date
    );
  END LOOP;
END;
$$;

SELECT absenta_create_monthly_partitions('"AbsenGerbangSiswa_new"'::regclass, 'AbsenGerbangSiswa', date_trunc('month', now())::date, 24);
SELECT absenta_create_monthly_partitions('"AbsenSiswa_new"'::regclass, 'AbsenSiswa', date_trunc('month', now())::date, 24);

CREATE TABLE IF NOT EXISTS "AbsenGerbangSiswa_default"
PARTITION OF "AbsenGerbangSiswa_new"
DEFAULT;

CREATE TABLE IF NOT EXISTS "AbsenSiswa_default"
PARTITION OF "AbsenSiswa_new"
DEFAULT;

-- Recreate partitioned indexes on parent (no duplication, as LIKE excluded indexes)
CREATE INDEX IF NOT EXISTS "AbsenGerbangSiswa_new_tenant_id_idx"
ON "AbsenGerbangSiswa_new" ("tenant_id");

CREATE INDEX IF NOT EXISTS "AbsenGerbangSiswa_new_tenant_created_at_idx"
ON "AbsenGerbangSiswa_new" ("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "AbsenGerbangSiswa_new_tenant_sesi_siswa_arah_idx"
ON "AbsenGerbangSiswa_new" ("tenant_id", "sesi_gerbang_id", "siswa_id", "arah");

CREATE INDEX IF NOT EXISTS "AbsenGerbangSiswa_new_tenant_siswa_arah_idx"
ON "AbsenGerbangSiswa_new" ("tenant_id", "siswa_id", "arah");

CREATE INDEX IF NOT EXISTS "AbsenGerbangSiswa_new_tenant_tahun_snapshot_idx"
ON "AbsenGerbangSiswa_new" ("tenant_id", "tahun_pelajaran_id_snapshot");

CREATE INDEX IF NOT EXISTS "AbsenSiswa_new_tenant_id_idx"
ON "AbsenSiswa_new" ("tenant_id");

CREATE INDEX IF NOT EXISTS "AbsenSiswa_new_tenant_created_at_idx"
ON "AbsenSiswa_new" ("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "AbsenSiswa_new_tenant_sesi_siswaakademik_idx"
ON "AbsenSiswa_new" ("tenant_id", "sesi_id", "siswa_akademik_id");

CREATE INDEX IF NOT EXISTS "AbsenSiswa_new_siswa_akademik_id_idx"
ON "AbsenSiswa_new" ("siswa_akademik_id");

CREATE INDEX IF NOT EXISTS "AbsenSiswa_new_siswa_id_idx"
ON "AbsenSiswa_new" ("siswa_id");

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS part
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE p.relname IN ('AbsenGerbangSiswa_new', 'AbsenSiswa_new')
  LOOP
    IF lower(r.part) LIKE 'absengerbangsiswa_%' OR lower(r.part) LIKE 'absengerbangsiswa%' THEN
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (%I,%I,%I);',
        r.part || '_uniq_sesi_siswa_arah',
        r.part,
        'sesi_gerbang_id','siswa_id','arah'
      );
    END IF;
    IF lower(r.part) LIKE 'absensiswa_%' OR lower(r.part) LIKE 'absensiswa%' THEN
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (%I,%I);',
        r.part || '_uniq_sesi_siswaakademik',
        r.part,
        'sesi_id','siswa_akademik_id'
      );
    END IF;
  END LOOP;
END;
$$;

INSERT INTO "AbsenGerbangSiswa_new" SELECT * FROM "AbsenGerbangSiswa";
INSERT INTO "AbsenSiswa_new" SELECT * FROM "AbsenSiswa";

ALTER TABLE "AbsenGerbangSiswa" RENAME TO "AbsenGerbangSiswa_old";
ALTER TABLE "AbsenGerbangSiswa_new" RENAME TO "AbsenGerbangSiswa";

ALTER TABLE "AbsenSiswa" RENAME TO "AbsenSiswa_old";
ALTER TABLE "AbsenSiswa_new" RENAME TO "AbsenSiswa";

COMMIT;
