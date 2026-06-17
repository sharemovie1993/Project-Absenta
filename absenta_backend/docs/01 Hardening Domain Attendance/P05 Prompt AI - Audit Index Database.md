AUDIT DATABASE INDEX — DOMAIN ABSENSI

Context
Sistem Absenta adalah SaaS absensi sekolah dengan volume event tinggi.

Perkiraan skala:
- hingga 1000 sekolah
- 1000–2000 siswa per sekolah
- 7–8 event absensi per siswa per hari

Total event harian dapat mencapai:
8 juta – 16 juta row insert per hari.

Audit ini bertujuan memastikan struktur index database tidak menjadi bottleneck.

Scope Audit
Hanya fokus pada tabel utama absensi:

1. AbsenGerbangSiswa
2. AbsenSiswa
3. SesiGerbang
4. SesiAbsensi

File referensi schema:
prisma/schema.prisma


--------------------------------

STEP 1 — Extract Index Structure

Tampilkan struktur index lengkap untuk tabel berikut:

AbsenGerbangSiswa
AbsenSiswa
SesiGerbang
SesiAbsensi

Yang perlu ditampilkan:

- semua @@index
- semua @@unique
- primary key
- field yang terlibat
- urutan field index

Output format:

Table: AbsenGerbangSiswa

Primary Key:
...

Unique:
...

Indexes:
...


--------------------------------

STEP 2 — Query Pattern Analysis

Analisis query yang paling sering terjadi pada domain absensi berdasarkan implementasi kode:

A. Tap Gerbang

Query pattern:

INSERT / UPSERT AbsenGerbangSiswa

Lookup:

WHERE
tenant_id
sesi_gerbang_id
siswa_id
arah


B. Validasi Sesi

Query pattern:

SELECT AbsenGerbangSiswa

WHERE
tenant_id
sesi_gerbang_id
siswa_id
arah


C. Tap Sesi

INSERT AbsenSiswa

Lookup:

WHERE
sesi_id
siswa_akademik_id


D. List Absensi Sesi

Query pattern:

SELECT AbsenSiswa

WHERE
tenant_id
sesi_id


E. List Absensi Harian

Query pattern:

SELECT AbsenGerbangSiswa

WHERE
tenant_id
created_at


--------------------------------

STEP 3 — Index Efficiency Evaluation

Evaluasi apakah index yang ada sudah optimal untuk query pattern tersebut.

Periksa:

1. Apakah urutan field index sudah benar.
2. Apakah ada query yang tidak memiliki index.
3. Apakah ada index yang berpotensi menjadi write bottleneck.
4. Apakah ada index yang sebenarnya tidak diperlukan.

Contoh potensi masalah yang perlu diidentifikasi:

- missing composite index
- index field order salah
- hot index page (created_at)
- redundant index


--------------------------------

STEP 4 — Scalability Risk

Identifikasi risiko index terhadap skala besar:

target sistem:

10–20 juta row per hari.

Periksa potensi masalah:

- write amplification
- index lock contention
- sequential scan
- hot index page


--------------------------------

STEP 5 — Recommendation

Berikan rekomendasi dalam format berikut:

GOOD
Index yang sudah optimal dan tidak perlu diubah.

IMPROVE
Index yang perlu diperbaiki.

ADD
Index yang sebaiknya ditambahkan.

REMOVE
Index yang tidak diperlukan.


--------------------------------

Output yang diharapkan

1. struktur index semua tabel absensi
2. analisis query pattern
3. potensi bottleneck
4. rekomendasi perubahan index (jika ada)

Catatan penting:

Audit ini hanya analisis.
JANGAN melakukan perubahan schema atau migration.