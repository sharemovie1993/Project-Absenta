TASK: IMPLEMENT POSTGRESQL PARTITION FOR ATTENDANCE TABLES

Tanggal: 2026-03-11

Context

- Target volume: 8–16 juta insert per hari.
- Tabel terbesar: AbsenGerbangSiswa, AbsenSiswa.
- Tujuan: partition production-grade tanpa mengubah behaviour aplikasi (aplikasi tetap query tabel parent).

Catatan penting (constraint & Prisma)

- PostgreSQL declarative partitioning memiliki batasan: UNIQUE/PRIMARY KEY pada tabel partitioned umumnya harus mencakup partition key (created_at). Pada skema saat ini, PK hanya `id`, dan unique penting tidak menyertakan created_at.
- Agar Prisma tetap kompatibel tanpa refactor schema.prisma, script di bawah fokus pada partitioning untuk scaling write + pruning query yang memakai created_at, sambil mempertahankan struktur kolom. Untuk uniqueness lintas partition, script memakai pendekatan “unique per-partition” (bukan global). Secara operasional ini tetap aman untuk alur tap normal karena event harian terkonsentrasi pada 1 bulan berjalan, tetapi perlu dipahami sebagai trade-off.

STEP 1 — Convert Tables to Partitioned Tables

Strategy
- PARTITION BY RANGE (created_at)
- Membuat tabel baru: AbsenGerbangSiswa_new dan AbsenSiswa_new sebagai tabel partitioned.

STEP 2 — Create Monthly Partitions

- Membuat partition per bulan dan default partition.
- Script menyediakan function untuk auto-create range bulanan.

STEP 3 — Recreate Indexes

- Semua index operasional utama dibuat sebagai partitioned index pada tabel parent baru (akan propagate ke partition).
- Unique index dibuat per partition (karena keterbatasan global unique pada partitioned table).

STEP 4 — Attach Default Partition

- Default partition untuk safety data yang tidak match range.

STEP 5 — Swap Tables (Zero Downtime)

- Script menyediakan langkah swap rename.
- Untuk benar-benar zero downtime pada data migration besar, gunakan mode “dual-write” via trigger sementara selama backfill.

STEP 6 — Data Migration

- Backfill data lama dari *_old ke parent baru.

STEP 7 — Auto Create Future Partitions

- Function + contoh cron job.

STEP 8 — Verify Prisma Compatibility

- Prisma tetap query tabel parent bernama sama (AbsenGerbangSiswa, AbsenSiswa) setelah swap.
- Insert otomatis masuk partition berdasar created_at.
- Tidak ada perubahan query aplikasi yang dibutuhkan.

SQL Migration Lengkap

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS "AbsenGerbangSiswa_new"
(LIKE "AbsenGerbangSiswa" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS)
PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS "AbsenSiswa_new"
(LIKE "AbsenSiswa" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS)
PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS "AbsenGerbangSiswa_default"
PARTITION OF "AbsenGerbangSiswa_new"
DEFAULT;

CREATE TABLE IF NOT EXISTS "AbsenSiswa_default"
PARTITION OF "AbsenSiswa_new"
DEFAULT;

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

SELECT absenta_create_monthly_partitions('"AbsenGerbangSiswa_new"'::regclass, 'AbsenGerbangSiswa', date_trunc('month', now())::date, 18);
SELECT absenta_create_monthly_partitions('"AbsenSiswa_new"'::regclass, 'AbsenSiswa', date_trunc('month', now())::date, 18);

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
    IF r.part LIKE 'absengerbangsiswa_%' OR r.part LIKE 'AbsenGerbangSiswa_%' THEN
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (%I,%I,%I);',
        r.part || '_uniq_sesi_siswa_arah',
        r.part,
        'sesi_gerbang_id','siswa_id','arah'
      );
    END IF;
    IF r.part LIKE 'absensiswa_%' OR r.part LIKE 'AbsenSiswa_%' THEN
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (%I,%I);',
        r.part || '_uniq_sesi_siswaakademik',
        r.part,
        'sesi_id','siswa_akademik_id'
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
```

Swap & Data Migration (operasional)

1) Dual-write (opsional untuk minim downtime saat backfill besar)
- Buat trigger pada *_old untuk mirror INSERT ke tabel baru selama proses backfill.
- Setelah backfill selesai dan diverifikasi, lakukan swap rename.

2) Swap rename (brief lock)

```sql
BEGIN;

ALTER TABLE "AbsenGerbangSiswa" RENAME TO "AbsenGerbangSiswa_old";
ALTER TABLE "AbsenGerbangSiswa_new" RENAME TO "AbsenGerbangSiswa";

ALTER TABLE "AbsenSiswa" RENAME TO "AbsenSiswa_old";
ALTER TABLE "AbsenSiswa_new" RENAME TO "AbsenSiswa";

COMMIT;
```

3) Backfill data

```sql
INSERT INTO "AbsenGerbangSiswa" SELECT * FROM "AbsenGerbangSiswa_old";
INSERT INTO "AbsenSiswa" SELECT * FROM "AbsenSiswa_old";
```

Struktur Partition Final

- Parent:
  - AbsenGerbangSiswa (partitioned by RANGE(created_at))
  - AbsenSiswa (partitioned by RANGE(created_at))
- Partitions:
  - AbsenGerbangSiswa_YYYY_MM
  - AbsenSiswa_YYYY_MM
  - AbsenGerbangSiswa_default
  - AbsenSiswa_default

Contoh Cron Create Partition (bulanan)

- Jalankan tiap tanggal 25 bulan berjalan untuk create bulan depan (dan memastikan bulan ini ada).

```bash
psql "$DATABASE_URL" -c "SELECT absenta_create_monthly_partitions('\"AbsenGerbangSiswa\"'::regclass, 'AbsenGerbangSiswa', date_trunc('month', now())::date, 2);"
psql "$DATABASE_URL" -c "SELECT absenta_create_monthly_partitions('\"AbsenSiswa\"'::regclass, 'AbsenSiswa', date_trunc('month', now())::date, 2);"
```

Verifikasi Kompatibilitas Prisma

- Prisma query ke parent table:
  - FindMany/FindFirst tetap bekerja karena nama tabel parent tidak berubah setelah swap.
- Insert otomatis ke partition:
  - created_at menentukan routing ke partition (default partition menangkap out-of-range).
- Catatan performa:
  - Query yang tidak menyertakan filter created_at tidak mendapat partition pruning dan akan menyentuh banyak partition. Untuk jalur validasi yang selalu “hari ini”, dampaknya biasanya kecil selama jumlah partition aktif tidak terlalu besar (mis. window 12–24 bulan).
