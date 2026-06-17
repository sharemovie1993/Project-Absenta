UPDATE CONTEXT — DATABASE SUDAH ADA DATA KECIL

Database sudah memiliki:

- seed data
- beberapa tenant testing

Tetapi volume data masih sangat kecil.

Karena itu kita tidak perlu strategi migration kompleks seperti:

- dual write trigger
- backfill bertahap
- zero downtime migration

Strategi yang diinginkan:

--------------------------------

STEP 1

Create partitioned table baru:

AbsenGerbangSiswa_new
AbsenSiswa_new

PARTITION BY RANGE (created_at)

--------------------------------

STEP 2

Create monthly partitions untuk 24 bulan:

AbsenGerbangSiswa_YYYY_MM
AbsenSiswa_YYYY_MM

--------------------------------

STEP 3

Create indexes pada parent table.

--------------------------------

STEP 4

Copy data lama:

INSERT INTO AbsenGerbangSiswa_new
SELECT * FROM AbsenGerbangSiswa;

INSERT INTO AbsenSiswa_new
SELECT * FROM AbsenSiswa;

--------------------------------

STEP 5

Rename tables:

ALTER TABLE AbsenGerbangSiswa RENAME TO AbsenGerbangSiswa_old;
ALTER TABLE AbsenGerbangSiswa_new RENAME TO AbsenGerbangSiswa;

ALTER TABLE AbsenSiswa RENAME TO AbsenSiswa_old;
ALTER TABLE AbsenSiswa_new RENAME TO AbsenSiswa;

--------------------------------

STEP 6

Verify:

SELECT count(*) sebelum dan sesudah sama.

--------------------------------

STEP 7

Create auto partition function:

absenta_create_monthly_partitions()

--------------------------------

STEP 8

Provide final SQL migration file.

--------------------------------

Tujuan:

- partition production grade
- tidak perlu refactor aplikasi
- kompatibel dengan Prisma