# MODULE ATTENDANCE

## Deskripsi
Modul Attendance adalah sistem manajemen kehadiran terpadu di platform Absenta.id yang mendukung integrasi perangkat keras (RFID/Face Recognition) dan pemantauan aktivitas belajar. Modul ini memiliki arsitektur **Hybrid Attendance** yang dapat beroperasi dalam dua mode utama sesuai kebutuhan sekolah.

## Aktor & Peran
- **Petugas Absensi**: Mengelola gerbang (Gate) dan melakukan bypass kehadiran jika diperlukan.
- **Guru Piket**: Memantau kehadiran siswa dan guru secara real-time di lingkungan sekolah.
- **Petugas Kelas**: Siswa yang ditugaskan melalui `OrganizationalAssignment` untuk membantu absensi di kelas.
- **Admin Sekolah**: Mengelola jadwal template, perangkat IoT, dan rekapitulasi laporan.

## Fitur Utama & Sub-Modul

### 1. Gate System (Gerbang)
- **Dual Mode Support**:
  - **SIMPLE Mode**: Absensi harian tunggal (Datang & Pulang) via gerbang.
  - **MULTI_SESI Mode**: Gate tap berfungsi sebagai **Prasyarat (Prerequisite)** sebelum siswa dapat melakukan absensi di dalam sesi kegiatan (KBM/Eskul).
- **Manual Bypass**: Fitur darurat untuk mencatat kehadiran siswa (Force HADIR) dengan audit log.
- **Duplicate Prevention**: Algoritma pencegahan tap ganda dalam rentang waktu yang sama.

### 2. Activity Sessions (Sesi Absensi)
- **KBM & Non-KBM**: Manajemen sesi untuk jam pelajaran, upacara, apel, dan ekstrakurikuler.
- **Auto Propagation**: Sistem dua arah untuk sinkronisasi kehadiran:
  - **Push**: Data tap gerbang baru otomatis masuk ke sesi aktif.
  - **Pull**: Pembuatan sesi baru otomatis menarik data ketidakhadiran (Izin/Sakit/Alpa) dari gerbang.
- **Overlap Detection**: Mencegah pembuatan sesi yang bertumpang tindih untuk satu kelas di waktu yang sama.

### 3. Smart Scheduling & Monitoring
- **Excel Importer**: Mendukung import jadwal massal dengan **Smart Match** untuk pemetaan otomatis nama Guru, Mapel, dan Kelas.
- **Guru Monitoring**: Dasbor khusus pemantauan kehadiran guru pengajar dan statistik harian kelas.
- **Kejadian Khusus**: Manajemen agenda khusus sekolah (Hari Libur/Kegiatan) yang dapat mengesampingkan aturan keterlambatan.

### 4. Manual & IoT Integration
- **Manual Attendance**: Input manual untuk status Izin, Sakit, Alpa, atau Dispensasi dengan notifikasi otomatis ke orang tua.
- **IoT Devices**: Pemantauan detak jantung perangkat (Heartbeat), level baterai, dan versi firmware.

### 5. Rekapitulasi & Reporting
- **Merge Strategy**: Laporan cerdas yang menggabungkan data dari Gerbang dan Sesi Aktivitas untuk memberikan gambaran kehadiran yang utuh.
- **Statistik Bulanan**: Perhitungan poin kehadiran, persentase kehadiran, dan tren keterlambatan.

## Teknologi & Pattern
- **Pattern**: Command/Query Separation, Repository Pattern, Event-Driven (via Domain Event Bus).
- **Integrasi**: Terhubung dengan `Notification Service` untuk pengiriman notifikasi real-time ke orang tua.
- **Real-time**: Menggunakan Socket.io (via `realtime` infra) untuk monitoring gerbang secara langsung.
