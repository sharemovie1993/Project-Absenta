# MODULE DASHBOARD

## Deskripsi
Modul Dashboard adalah penyedia data analitik agregat real-time yang memetakan statistik operasional sekolah berdasarkan peran aktor pengguna. Modul ini menyajikan ringkasan eksekutif untuk Kepsek, statistik penugasan untuk Guru, grafik pelanggaran untuk Kesiswaan, dan pemantauan gerbang untuk petugas piket.

## Aktor & Peran
- **Kepala Sekolah**: Statistik global sekolah, tren kehadiran bulanan, eskalasi kasus BK.
- **Wakasek Kurikulum**: Pemantauan jadwal KBM dan supervisi guru.
- **Wakasek Kesiswaan**: Visualisasi pelanggaran siswa, grafik prestasi, data EWS BK.
- **Petugas Gerbang**: Log live tapping RFID dan statistik kehadiran gerbang harian.

## Sub-Modul & Fitur Terimplementasi
### 1. Role-Based Stats Compiler
- **Endpoint Aggregator**: Mengumpulkan metrik dari modul akademik, sarpras, hubin, dan bk secara instan sesuai kebutuhan dashboard peran tertentu.
- **Live Leaderboard**: Penghargaan guru aktif dan kelas terdisiplin.

## Teknologi & Pattern
- **Pattern**: API Gateway Aggregator, Role-Based Analytics.
- **Integrasi**: Query lintas modul (BPBK, Sarpras, Kurikulum, Akademik) dengan isolasi data.
