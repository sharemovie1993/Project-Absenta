TASK: AUDIT QUERY PLAN — DOMAIN ABSENSI

Context

Database Absenta sudah menggunakan partition untuk tabel:

- AbsenGerbangSiswa
- AbsenSiswa

Partition strategy:

PARTITION BY RANGE(created_at)
Monthly partitions

Tujuan audit ini adalah memastikan PostgreSQL melakukan:

1. partition pruning
2. index scan
3. tidak melakukan sequential scan seluruh partition

Audit ini hanya menggunakan EXPLAIN ANALYZE.
Tidak ada perubahan data.

--------------------------------

STEP 1 — List partitions

Jalankan query berikut:

SELECT
  parent.relname AS parent_table,
  child.relname AS partition_table
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('AbsenGerbangSiswa','AbsenSiswa');

Tujuan:
memastikan partition sudah terpasang.

--------------------------------

STEP 2 — Audit query laporan bulanan siswa

EXPLAIN ANALYZE
SELECT *
FROM "AbsenSiswa"
WHERE siswa_id IS NOT NULL
AND created_at >= date_trunc('month', now())
AND created_at < date_trunc('month', now()) + interval '1 month'
LIMIT 100;

Yang diharapkan:

- planner hanya membaca 1 partition
- menggunakan index scan

--------------------------------

STEP 3 — Audit query validasi gerbang

EXPLAIN ANALYZE
SELECT id
FROM "AbsenGerbangSiswa"
WHERE tenant_id IS NOT NULL
AND siswa_id IS NOT NULL
AND arah = 'GERBANG_DATANG'
LIMIT 1;

Yang diharapkan:

- index scan
- tidak sequential scan seluruh tabel

--------------------------------

STEP 4 — Audit query laporan kelas

EXPLAIN ANALYZE
SELECT *
FROM "AbsenSiswa"
WHERE sesi_id IS NOT NULL
LIMIT 100;

Yang diharapkan:

- index pada (sesi_id atau tenant_id,sesi_id)
- bukan sequential scan seluruh tabel

--------------------------------

STEP 5 — Laporkan hasil

Untuk setiap query laporkan:

1. query plan output
2. apakah partition pruning terjadi
3. apakah index scan digunakan
4. apakah sequential scan terjadi

Jika ditemukan sequential scan pada tabel besar,
berikan rekomendasi index yang diperlukan.

--------------------------------

OUTPUT YANG DIHARAPKAN

Laporan audit:

- Partition pruning status
- Index usage
- Query cost
- Potensi bottleneck query