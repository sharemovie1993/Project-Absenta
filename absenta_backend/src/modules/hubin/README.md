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

### 5. Integrasi & Utilitas
- **Google Drive Integration**: Penyimpanan otomatis foto absensi, dokumen MoU, dan jurnal portofolio ke Google Drive tenant.
- **Recent Activity Monitoring**: Pemantauan real-time seluruh log aktivitas HUBIN (Mitra, PKL, BKK, TEFA) untuk transparansi operasional.
- **WA Gateway Integration**: Notifikasi otomatis terkait penempatan, undangan interview, dan pengingat pelaporan PKL.

## Teknologi & Pattern
- **Pattern**: Service Layer, Enterprise Scoping (Unit Restricted), Anti-Fraud Validation.
- **Security**: Geofencing (Haversine Formula), Accuracy Validation, Capabilities-based Access Control.
- **Integrasi**: Google Drive API (deprecated in favor of storageService), WhatsApp Service, studentResolver.
