# MODULE KESISWAAN

## Deskripsi
Modul Kesiswaan pada platform Absenta.id berfokus pada manajemen kedisiplinan, pencapaian prestasi, dan operasional harian melalui fungsi piket. Modul ini dirancang untuk memberikan gambaran komprehensif tentang perilaku siswa di luar aspek akademik murni, dengan integrasi ketat ke dalam histori akademik per semester.

## Aktor & Peran
- **Wakasek Kesiswaan**: Pengatur kebijakan poin, kategori pelanggaran, dan peninjau statistik kedisiplinan global.
- **Guru Piket**: Aktor operasional harian yang mengelola izin keluar-masuk siswa dan pemantauan lingkungan.
- **Wali Kelas**: Pemantau kedisiplinan dan prestasi khusus untuk siswa di kelas binaannya.
- **Siswa & Orang Tua**: Penerima informasi poin dan prestasi sebagai bagian dari pembinaan karakter.

## Sub-Modul & Fitur Terimplementasi

### 1. Kedisiplinan & Pelanggaran
- **Manajemen Poin**: Sistem poin akumulatif berdasarkan kategori pelanggaran (Ringan, Sedang, Berat).
- **Auto-Seeding**: Setiap tenant baru secara otomatis mendapatkan 18+ jenis pelanggaran standar (terlambat, atribut, merokok, berkelahi, dll) untuk mempercepat setup.
- **Academic Context**: Setiap catatan pelanggaran terikat pada snapshot `SiswaAkademik`, memastikan riwayat tetap akurat meskipun siswa pindah kelas atau naik tingkat.
- **Status Lifecycle**: Pelacakan status pelanggaran mulai dari `BARU` hingga proses pembinaan lebih lanjut.
- **Data Scoping**: Filter akses otomatis di mana Wali Kelas hanya dapat melihat pelanggaran siswa di kelasnya sendiri.

### 2. Manajemen Prestasi
- **Reward System**: Pemberian poin prestasi untuk mengapresiasi pencapaian siswa di berbagai bidang.
- **Kategori Luas**: Mencakup prestasi Akademik, Non-Akademik (Olahraga/Seni), Keorganisasian (OSIS/Paskibraka), serta Karakter & Keagamaan (Tahfidz).
- **Default Master Data**: Dilengkapi dengan daftar prestasi standar (Juara Kelas, KSN/OSN, Hafizh Qur'an) beserta bobot poinnya.

### 3. Layanan Piket & Izin
- **Izin Keluar-Masuk**: Pencatatan digital izin meninggalkan sekolah dengan pelacakan waktu keluar dan waktu kembali secara real-time.
- **Daily Monitoring**: Dasbor pemantauan untuk guru piket melihat siswa yang sedang berada di luar area sekolah.
- **Robust Resolution**: Sistem secara otomatis mencari data akademik aktif siswa saat pembuatan izin hanya dengan menggunakan ID Siswa dasar.

### 4. Jadwal Kegiatan (Penjadwalan Kegiatan Non-KBM)
> **Catatan Arsitektur (2026-07)**: Sub-modul ini telah dipindahkan dari Modul Attendance ke Modul Kesiswaan sebagai bagian dari pemisahan domain yang lebih bersih. Jadwal Kegiatan adalah fitur **GRATIS** dan tidak memerlukan lisensi berbayar.
- **Penjadwalan Fleksibel**: Membuat template jadwal kegiatan berulang (eskul, pembiasaan, upacara) yang terpisah dari Jadwal KBM kurikulum.
- **Masa Berlaku Otomatis**: Jadwal dapat dikonfigurasi untuk satu semester, dua semester, atau sepanjang tahun pelajaran aktif tanpa input tanggal manual.
- **Manajemen Anggota**: Mendukung pengelolaan anggota dan pembina untuk setiap kegiatan/eskul.
- **Capability Domain**: `kesiswaan.schedules.*` (view.list, create, update, delete)
- **Endpoint API**:
  - `GET /api/kesiswaan/jadwal-kegiatan` — Daftar jadwal kegiatan.
  - `GET /api/kesiswaan/jadwal-kegiatan/:id` — Detail jadwal kegiatan.
  - `POST /api/kesiswaan/jadwal-kegiatan` — Buat jadwal kegiatan baru.
  - `PUT /api/kesiswaan/jadwal-kegiatan/:id` — Perbarui jadwal kegiatan.
  - `DELETE /api/kesiswaan/jadwal-kegiatan/:id` — Hapus jadwal kegiatan.
  - `GET /api/attendance/anggota-kegiatan-eskul/:jenisKegiatanId` — Daftar anggota eskul.
  - `POST /api/attendance/anggota-kegiatan-eskul/:jenisKegiatanId/add` — Tambah anggota (bulk).
  - `GET /api/attendance/pembina-kegiatan-eskul/:jenisKegiatanId` — Daftar pembina eskul.

## Teknologi & Pattern
- **Pattern**: Service Layer, Event Consumer (Redis-based), Data Scoping Utility.
- **Security**: Role-based access control terintegrasi dengan `applyDataScope` untuk isolasi data antar kelas. Capability domain `kesiswaan.schedules.*` digunakan untuk otorisasi akses Jadwal Kegiatan, Anggota Eskul, dan Pembina Eskul.
- **Integrasi**: 
  - `Academic Module`: Untuk resolusi ID akademik dan data kelas.
  - `Infra Event Bus`: Menangani event `tenant.created` untuk otomasi seeding.
- **Database**: Prisma ORM dengan PostgreSQL, menggunakan indexing pada `tenant_id` dan `siswa_id`.
