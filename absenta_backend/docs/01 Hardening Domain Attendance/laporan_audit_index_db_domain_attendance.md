AUDIT DATABASE INDEX — DOMAIN ABSENSI

Tanggal: 2026-03-11

Scope

- Tabel: AbsenGerbangSiswa, AbsenSiswa, SesiGerbang, SesiAbsensi
- Sumber skema: prisma/schema.prisma
- Catatan: Audit hanya analisis. Tidak ada perubahan schema atau migrasi.

STEP 1 — Extract Index Structure

Table: SesiAbsensi

- Primary Key:
  - id
- Unique:
  - (tidak ada deklarasi @@unique)
- Indexes:
  - @@index([tenant_id])
  - @@index([tenant_id, tanggal])
  - @@index([tenant_id, kelas_id, tanggal])
  - @@index([tenant_id, created_by_user_id])
  - @@index([tenant_id, tahun_pelajaran_id])

Table: AbsenSiswa

- Primary Key:
  - id
- Unique:
  - @@unique([sesi_id, siswa_akademik_id])
- Indexes:
  - @@index([tenant_id])
  - @@index([tenant_id, sesi_id, siswa_akademik_id])
  - @@index([siswa_akademik_id])
  - @@index([siswa_id])
  - @@index([tenant_id, created_at])

Table: SesiGerbang

- Primary Key:
  - id
- Unique:
  - @@unique([tenant_id, tanggal])
- Indexes:
  - @@index([tenant_id])
  - @@index([tenant_id, tanggal])
  - @@index([tenant_id, tahun_pelajaran_id])

Table: AbsenGerbangSiswa

- Primary Key:
  - id
- Unique:
  - @@unique([sesi_gerbang_id, siswa_id, arah])
- Indexes:
  - @@index([tenant_id])
  - @@index([tenant_id, sesi_gerbang_id, siswa_id, arah])
  - @@index([tenant_id, siswa_id, arah])
  - @@index([tenant_id, tahun_pelajaran_id_snapshot])
  - @@index([tenant_id, created_at])

STEP 2 — Query Pattern Analysis

A. Tap Gerbang

- Operasi: INSERT (insert-first, duplicate via unique constraint)
- Lookup terkait validasi/korelasi:
  - WHERE tenant_id, sesi_gerbang_id, siswa_id, arah (idempotensi/unik)

B. Validasi Sesi Gerbang (cek kehadiran gerbang)

- Operasi: SELECT AbsenGerbangSiswa
- Filter umum:
  - WHERE tenant_id, sesi_gerbang_id, siswa_id, arah

C. Tap Sesi

- Operasi: INSERT AbsenSiswa
- Lookup terkait idempotensi:
  - WHERE sesi_id, siswa_akademik_id (unique)

D. List Absensi Sesi

- Operasi: SELECT AbsenSiswa
- Filter umum:
  - WHERE tenant_id, sesi_id

E. List Absensi Harian (Gerbang)

- Operasi: SELECT AbsenGerbangSiswa
- Filter umum:
  - WHERE tenant_id, created_at (by day), opsi arah/siswa

STEP 3 — Index Efficiency Evaluation

- SesiGerbang
  - Unique ([tenant_id, tanggal]) selaras dengan akses harian per-tenant.
  - Index ([tenant_id, tanggal]) mempercepat pencarian sesi harian, konsisten dengan query.
  - Index ([tenant_id, tahun_pelajaran_id]) mendukung laporan/rekap akademik.
  - Evaluasi: GOOD.

- AbsenGerbangSiswa
  - Unique ([sesi_gerbang_id, siswa_id, arah]) mendukung idempotensi tap.
  - Index gabungan ([tenant_id, sesi_gerbang_id, siswa_id, arah]) sejalur dengan filter validasi.
  - Index ([tenant_id, siswa_id, arah]) membantu lookup tanpa sesi (kasus agregasi tertentu).
  - Index ([tenant_id, created_at]) untuk list harian; berpotensi jadi hot page saat write heavy, namun relevan untuk query harian.
  - Evaluasi: GOOD, dengan catatan created_at bisa menjadi titik kontensi pada puncak insert.

- AbsenSiswa
  - Unique ([sesi_id, siswa_akademik_id]) sesuai idempotensi di jalur sesi.
  - Index ([tenant_id, sesi_id, siswa_akademik_id]) sinkron dengan filter sesi.
  - Index ([tenant_id, created_at]) mendukung query laporan harian; sama catatan hot page seperti di gerbang.
  - Index ([siswa_id]) dan ([siswa_akademik_id]) bermanfaat untuk pencarian per siswa/akademik.
  - Evaluasi: GOOD.

- SesiAbsensi
  - Index ([tenant_id, tanggal]) dan ([tenant_id, kelas_id, tanggal]) sesuai query list per kelas/hari.
  - Index ([tenant_id, tahun_pelajaran_id]) membantu rekap akademik.
  - Evaluasi: GOOD.

STEP 4 — Scalability Risk

- Write Amplification
  - Tabel AbsenGerbangSiswa dan AbsenSiswa memiliki beberapa index; setiap insert memperbarui banyak index.
  - Pada 8–16 juta insert/hari, overhead index write perlu diperhatikan.

- Hot Index Page (created_at)
  - Index ([tenant_id, created_at]) bersifat time-ascending sehingga dapat memicu hotspot di halaman kanan index pada beban tulis tinggi.
  - Efek: potensi lock contention saat burst.

- Pool/Throughput
  - Query pattern utama sudah ditopang index komposit yang tepat sehingga risiko sequential scan rendah.

STEP 5 — Recommendation

GOOD

- SesiGerbang: Unique ([tenant_id, tanggal]) dan index terkait sudah sejalan dengan query.
- AbsenGerbangSiswa: Unique ([sesi_gerbang_id, siswa_id, arah]) dan index komposit sesuai idempotensi dan validasi.
- AbsenSiswa: Unique ([sesi_id, siswa_akademik_id]) serta index komposit mendukung jalur sesi.
- SesiAbsensi: Index per tenant+tanggal+kelas mendukung listing operasional harian.

IMPROVE

- Pantau metrik write contention pada index ([tenant_id, created_at]) di AbsenGerbangSiswa dan AbsenSiswa.
  - Jika beban write harian mendekati 10–20 juta row, pertimbangkan mitigasi operasional (misal sharding logika per tenant/partisi harian pada level infrastruktur atau pengaturan autovacuum yang agresif). Ini rekomendasi operasional, bukan perubahan skema.

ADD

- Tidak ada penambahan index yang diperlukan berdasarkan pattern saat ini.

REMOVE

- Tidak ada index yang tampak redundan untuk pattern yang teridentifikasi.

Catatan

- Audit ini hanya analisis. Tidak ada perubahan schema/migrasi yang dilakukan.
