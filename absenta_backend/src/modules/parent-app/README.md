# MODULE PARENT PORTAL API

## Deskripsi
Modul Parent Portal menyediakan antarmuka API khusus yang mendukung aplikasi seluler/web Orang Tua/Wali Murid. Modul ini didesain secara **Stateless** dan terisolasi dari domain administrasi sekolah untuk menjaga privasi data internal sekolah.

## Aktor & Peran
- **Orang Tua / Wali Murid**: Memantau kehadiran anak, menerima notifikasi kasus BK, melihat rekap bulanan, dan melaporkan izin ketidakhadiran siswa.

## Sub-Modul & Fitur Terimplementasi
### 1. Student Tracking & Reports
- **Real-Time Attendance Stream**: Riwayat kedatangan/kepulangan anak secara presisi.
- **Absence Reporting**: Fitur pengajuan izin sakit/keperluan anak beserta unggahan dokumen bukti fisik.
- **Parent Notifications**: Riwayat pesan transaksional dari sekolah kepada orang tua.

## Teknologi & Pattern
- **Pattern**: Stateless Parent Auth Token, Isolated Query Scope.
- **Database**: Membaca relasi `Siswa` ke `OrangTua` untuk hak akses data.
