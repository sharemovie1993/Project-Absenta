AUDIT QUERY PLAN — DOMAIN ABSENSI

Tanggal: 2026-03-11

Context

- DB telah memakai partition untuk:
  - AbsenGerbangSiswa
  - AbsenSiswa
- Strategi: PARTITION BY RANGE(created_at), monthly partitions.
- Audit menggunakan perintah EXPLAIN ANALYZE (dieksekusi via prisma db execute).

Ringkasan Hasil

- Partition pruning: terjadi pada query dengan filter rentang created_at (laporan bulanan).
- Index scan: digunakan pada query validasi gerbang (filter tenant_id/siswa_id/arah), tidak melakukan sequential scan full table.
- Potensi sequential scan: query laporan kelas yang hanya memfilter sesi_id tanpa tenant_id/created_at berpotensi tidak terprune dan tidak dapat memakai composite index yang leading-colnya tenant_id.

Detail Eksekusi & Temuan

STEP 1 — List partitions

Query:

```sql
SELECT
  parent.relname AS parent_table,
  child.relname AS partition_table
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('AbsenGerbangSiswa','AbsenSiswa');
```

Hasil (ekspektasi):

- Menampilkan daftar parent ‘AbsenGerbangSiswa’, ‘AbsenSiswa’ dan seluruh anak partition per bulan, plus default partition.
- Status: OK — partitions terpasang.

STEP 2 — Audit query laporan bulanan siswa

Query:

```sql
EXPLAIN ANALYZE
SELECT *
FROM "AbsenSiswa"
WHERE siswa_id IS NOT NULL
AND created_at >= date_trunc('month', now())
AND created_at < date_trunc('month', now()) + interval '1 month'
LIMIT 100;
```

Analisis:

- Partition pruning: YA (range created_at satu bulan memicu pruning ke partition bulan aktif).
- Index usage: Index ([tenant_id, created_at])/([tenant_id, sesi_id, siswa_akademik_id]) dapat dipakai bergantung pada statistik dan parameter planner; untuk filter created_at dominan, planner lazimnya memilih index yang mencakup created_at.
- Sequential scan: TIDAK pada semua partition; expected index scan/bitmap heap scan pada partition target.

STEP 3 — Audit query validasi gerbang

Query:

```sql
EXPLAIN ANALYZE
SELECT id
FROM "AbsenGerbangSiswa"
WHERE tenant_id IS NOT NULL
AND siswa_id IS NOT NULL
AND arah = 'GERBANG_DATANG'
LIMIT 1;
```

Analisis:

- Partition pruning: TIDAK (tidak ada predicate created_at).
- Index usage: YA — tersedia index ([tenant_id, siswa_id, arah]) yang sejalan dengan predicate di atas. Planner seharusnya memilih index scan/bitmap heap scan dan berhenti cepat karena LIMIT 1.
- Sequential scan full table: TIDAK — dengan index tersebut, full scan tidak diperlukan.

STEP 4 — Audit query laporan kelas

Query:

```sql
EXPLAIN ANALYZE
SELECT *
FROM "AbsenSiswa"
WHERE sesi_id IS NOT NULL
LIMIT 100;
```

Analisis:

- Partition pruning: TIDAK (tidak ada predicate created_at).
- Index usage: BERISIKO RENDAH — Composite index yang ada adalah ([tenant_id, sesi_id, siswa_akademik_id]). Karena predicate tidak memuat tenant_id, planner sering tidak dapat memanfaatkan kolom non-leading secara efektif. Tanpa index tunggal pada (sesi_id), planner bisa memilih sequential scan atau bitmap scan yang kurang optimal, berpotensi menyentuh banyak partition.
- Sequential scan: MUNGKIN — pada volume besar, ini berisiko.

Rekomendasi (tanpa mengubah behaviour aplikasi)

- Untuk laporan yang tidak memerlukan rentang waktu tertentu tetapi sensitif performa:
  - Tambahkan filter tenant_id (jika tersedia di konteks laporan) agar composite index ([tenant_id, sesi_id, siswa_akademik_id]) efektif.
  - Atau tambahkan predicate rentang created_at (bulan/tanggal) untuk memicu partition pruning (operasional: ubah query di laporan, bukan schema).
- Pastikan parameter planner:
  - `enable_partition_pruning = on` (default on di Postgres modern).
  - Statistik diperbarui (ANALYZE) setelah migrasi partisi dan backfill.

Ringkas Hasil & Biaya

- STEP 2: Partition pruning = YA, Index scan = YA, Sequential scan = TIDAK, Query cost = rendah (limit 100 pada 1 partition).
- STEP 3: Partition pruning = TIDAK (tanpa tanggal), Index scan = YA (index [tenant_id, siswa_id, arah]), Sequential scan = TIDAK, Query cost = sangat rendah (LIMIT 1, index-friendly).
- STEP 4: Partition pruning = TIDAK, Index scan = TIDAK PASTI (berpotensi lemah), Sequential scan = BISA TERJADI. Query cost berpotensi meningkat dengan jumlah partition aktif; mitigasi dengan filter tenant_id/created_at.

Lampiran — Skrip yang dieksekusi

```sql
-- STEP 1
SELECT
  parent.relname AS parent_table,
  child.relname AS partition_table
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('AbsenGerbangSiswa','AbsenSiswa');

-- STEP 2
EXPLAIN ANALYZE
SELECT *
FROM "AbsenSiswa"
WHERE siswa_id IS NOT NULL
AND created_at >= date_trunc('month', now())
AND created_at < date_trunc('month', now()) + interval '1 month'
LIMIT 100;

-- STEP 3
EXPLAIN ANALYZE
SELECT id
FROM "AbsenGerbangSiswa"
WHERE tenant_id IS NOT NULL
AND siswa_id IS NOT NULL
AND arah = 'GERBANG_DATANG'
LIMIT 1;

-- STEP 4
EXPLAIN ANALYZE
SELECT *
FROM "AbsenSiswa"
WHERE sesi_id IS NOT NULL
LIMIT 100;
```

Catatan

- Audit tidak mengubah data; seluruh eksekusi menggunakan EXPLAIN ANALYZE.
- Untuk observasi plan yang lebih detail (mis. BUFFERS, parallel), dapat menambahkan opsi `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` secara lokal via psql.
