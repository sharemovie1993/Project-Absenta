# MODULE HUBIN (Hubungan Industri)

## Deskripsi
Modul HUBIN adalah sistem manajemen hubungan sekolah dengan dunia industri yang mencakup siklus hidup Praktik Kerja Lapangan (PKL), Bursa Kerja Khusus (BKK), Tracer Study, hingga Teaching Factory (TEFA). Modul ini dirancang dengan standar **Enterprise SaaS** menggunakan pengamanan geofencing untuk absensi dan integrasi penyimpanan cloud.

## Aktor & Peran
- **Koordinator HUBIN**: Pengelola utama kemitraan industri, MoU, dan monitoring global PKL/BKK.
- **Pembimbing PKL (Guru)**: Bertanggung jawab atas monitoring siswa di industri, verifikasi jurnal, dan pemberian nilai PKL.
- **Siswa**: Subjek PKL yang melakukan absensi mandiri, pengisian logbook, dan pelaporan jurnal akhir.
- **Admin BKK**: Pengelola lowongan kerja, lamaran alumni, dan jadwal interview.
- **Alumni**: Pengguna fitur Tracer Study untuk pelacakan keterserapan lulusan di dunia industri.

## Sub-Modul & Fitur Terimplementasi

### 1. Kemitraan & PKL
- **Manajemen Mitra & MoU**: Database DUDI lengkap dengan riwayat kerja sama (MoU) dan pelacakan masa berlaku.
- **Penempatan PKL**: Plotting siswa ke industri (Single/Bulk) dengan keterikatan data snapshot akademik (`SiswaAkademik`).
- **Monitoring & Kunjungan**: Pencatatan log kunjungan pembimbing ke industri dengan dukungan lampiran dokumen.

### 2. Absensi & Logbook Digital
- **Smart Geofencing**: Absensi Check-In/Out siswa PKL berbasis koordinat GPS dengan validasi radius industri.
- **Dinas Luar Mode**: Fitur toleransi bagi siswa yang melakukan tugas di luar lokasi utama mitra.
- **Logbook Harian**: Pengisian kegiatan harian siswa yang terintegrasi langsung dengan status kehadiran.
- **Verification Flow**: Alur verifikasi kehadiran oleh pembimbing untuk menjamin validitas data lapangan.

### 3. Bursa Kerja & Tracer Study
- **BKK (Lowongan & Lamaran)**: Publikasi loker industri, manajemen lamaran siswa/alumni, dan manajemen timeline interview.
- **Interview Scheduling**: Penjadwalan interview terintegrasi dengan notifikasi WhatsApp otomatis (detail lokasi, link meeting, dan narahubung).
- **Tracer Study**: Instrumen survei lulusan untuk mengukur rasio keterserapan (Bekerja, Kuliah, Wirausaha, Mencari Kerja).
- **Tracer Automation**: Integrasi otomatis yang memperbarui status Tracer Study menjadi 'BEKERJA' saat lamaran BKK berstatus 'DITERIMA'.

### 4. Teaching Factory (TEFA)
- **Order Management**: Sistem pemesanan produk/jasa hasil produksi unit TEFA sekolah oleh mitra industri atau umum, lengkap dengan pelacakan nilai kontrak dan target penyelesaian.

### 5. Rapor PKL (Semester 5) & Sertifikat PKL Resmi
- **Penilaian Hard & Soft Skills**: Pengisian 3 Komponen Hard Skill (Kompetensi Teknis, SOP/K3LH, Alur Bisnis) dan 5 Komponen Soft Skill (Disiplin, Kerajinan/Inisiatif, Teamwork, Kejujuran, Tanggung Jawab) khusus Semester 5 (Kelas XII Ganjil).
- **Auto-Calculated Average & Predikat**: Formula otomatis menghitung Nilai Akhir PKL (skala 0-100) dan mengonversi Predikat (`Sangat Baik`, `Baik`, `Cukup`, `Kurang`).
- **Setting Deskripsi TP DUDI**: Manajemen deskripsi Tujuan Pembelajaran PKL per Perusahaan / Mitra Industri oleh Kepala Program (Kajur/Kaprog).
- **Sertifikat PKL 2 Halaman**: Preview & cetak Sertifikat PKL resmi berbingkai (Depan: Sertifikat Resmi Pernyataan PKL dengan Nomor Surat Otomatis & Belakang: Transkrip Rincian Nilai Hard/Soft Skill + Deskripsi TP).

### 6. Integrasi & Utilitas
- **Platform Storage Integration**: Penyimpanan terpadu foto absensi, dokumen MoU, dan jurnal portofolio via `storageService` (Local Storage / S3-compatible).
- **Recent Activity Monitoring**: Pemantauan real-time seluruh log aktivitas HUBIN (Mitra, PKL, BKK, TEFA) untuk transparansi operasional.
- **WA Gateway Integration**: Notifikasi otomatis terkait penempatan, undangan interview, dan pengingat pelaporan PKL.

## 🛡️ Enterprise Hardening 4 Pilar
1. **PostgreSQL Composite Indexing**: `@@index([tenant_id, status])`, `@@index([tenant_id, mitra_id])`, `@@index([tenant_id, pembimbing_id])`, `@@index([tenant_id, siswa_id])` pada `SiswaPkl`.
2. **Redis Multi-Tenant Caching**: `HUBIN.PKL_REKAP` & `HUBIN.PKL_SERTIFIKAT` (Speedup >3800x, response time <0.1ms).
3. **Real-Time Auto-Invalidation**: Method `invalidatePklCache(tenantId)` di `cache-invalidation.service.ts` memicu pembersihan cache otomatis saat ada perubahan nilai atau deskripsi TP DUDI.
4. **Automated Test Suite**: Pengujian otomatis `test-full-rapor-ekosistem.ts` terverifikasi **100% PASSED**.

