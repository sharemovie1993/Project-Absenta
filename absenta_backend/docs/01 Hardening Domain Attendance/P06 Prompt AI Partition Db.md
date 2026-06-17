TASK: IMPLEMENT POSTGRESQL PARTITION FOR ATTENDANCE TABLES

Context
Absenta adalah SaaS absensi sekolah dengan potensi 8–16 juta event per hari.

Tabel yang paling besar adalah:

AbsenGerbangSiswa
AbsenSiswa

Schema sudah menggunakan field:

created_at TIMESTAMPTZ

Tujuan task ini adalah membuat PostgreSQL partition production-grade tanpa mengubah behaviour aplikasi.

Aplikasi tetap query parent table.


--------------------------------

STEP 1 — Convert Tables to Partitioned Tables

Ubah tabel berikut menjadi partitioned table:

AbsenGerbangSiswa
AbsenSiswa

Strategy:

PARTITION BY RANGE (created_at)

Contoh:

CREATE TABLE AbsenGerbangSiswa_new (
   LIKE "AbsenGerbangSiswa" INCLUDING ALL
) PARTITION BY RANGE (created_at);


--------------------------------

STEP 2 — Create Monthly Partitions

Buat partition per bulan.

Contoh:

CREATE TABLE AbsenGerbangSiswa_2026_03
PARTITION OF "AbsenGerbangSiswa_new"
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

Lakukan hal yang sama untuk:

AbsenSiswa


--------------------------------

STEP 3 — Recreate Indexes

Semua index dari parent table harus diterapkan ke partition.

Contoh:

CREATE INDEX ON AbsenGerbangSiswa_2026_03 (tenant_id, created_at);

CREATE INDEX ON AbsenGerbangSiswa_2026_03
(tenant_id, sesi_gerbang_id, siswa_id, arah);

Lakukan juga untuk tabel AbsenSiswa.


--------------------------------

STEP 4 — Attach Default Partition

Tambahkan default partition untuk safety.

Contoh:

CREATE TABLE AbsenGerbangSiswa_default
PARTITION OF "AbsenGerbangSiswa_new"
DEFAULT;


--------------------------------

STEP 5 — Swap Tables (Zero Downtime)

Rename tabel lama dan ganti dengan partitioned table.

Langkah:

ALTER TABLE "AbsenGerbangSiswa" RENAME TO "AbsenGerbangSiswa_old";

ALTER TABLE "AbsenGerbangSiswa_new" RENAME TO "AbsenGerbangSiswa";


--------------------------------

STEP 6 — Data Migration

Jika ada data existing:

INSERT INTO "AbsenGerbangSiswa"
SELECT * FROM "AbsenGerbangSiswa_old";

PostgreSQL akan otomatis memindahkan data ke partition yang benar.


--------------------------------

STEP 7 — Auto Create Future Partitions

Buat function PostgreSQL untuk auto create partition setiap bulan.

Contoh function:

create_partition_if_not_exists(date)


Jalankan melalui cron job bulanan.


--------------------------------

STEP 8 — Verify Prisma Compatibility

Pastikan:

- Prisma tetap query parent table
- Insert otomatis masuk ke partition
- Tidak ada perubahan query aplikasi


--------------------------------

OUTPUT YANG DIHARAPKAN

1. SQL migration lengkap
2. Struktur partition final
3. contoh cron create partition
4. verifikasi kompatibilitas Prisma