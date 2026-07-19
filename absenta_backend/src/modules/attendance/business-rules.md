# BUSINESS RULES - ATTENDANCE

### 1. Gate Attendance (Gerbang)
- **Mode SIMPLE**:
  - Sistem hanya mencatat `GERBANG_DATANG` dan `GERBANG_PULANG`.
  - Poin kehadiran diberikan berdasarkan ketepatan waktu tap terhadap batas jam masuk sekolah.
- **Mode MULTI_SESI**:
  - Tap `GERBANG_DATANG` bersifat **MANDATORY** sebagai prasyarat akses absensi di sesi KBM/Eskul.
  - Jika siswa belum tap di gerbang, status mereka di sesi kegiatan akan tetap "Belum Hadir" meskipun hadir di kelas.
- **Duplicate Tap**: Tap dengan arah yang sama (misal: MASUK) untuk siswa yang sama dalam satu sesi gerbang yang sama akan ditolak/dianggap duplikat.

### 2. Activity Session Management
- **Teacher Requirement**: Sesi dengan tipe `KBM` atau `ESKUL` wajib memiliki `guru_id`.
- **Session Conflict**: Sistem menolak pembuatan sesi baru jika terdapat sesi lain yang masih `BERLANGSUNG` pada kelas, tanggal, dan jam yang sama.
- **Auto-Close**: Sesi dianggap selesai secara sistem saat mencapai `waktu_selesai`, namun status operasional dapat ditutup secara manual oleh guru/petugas.
- **Timezone Support**: Perhitungan hari, sesi, dan visualisasi dashboard operasional absensi harus diselaraskan secara konsisten berdasarkan zona waktu aktif tenant (WIB: UTC+7, WITA: UTC+8, WIT: UTC+9). Seluruh kueri penanggalan harian wajib menggunakan shifted local date (helper `toLocalDate()`) untuk mencegah ketidaksinkronan data di pagi hari sebelum pukul 07:00 WIB (karena perbedaan tanggal hari dengan UTC).
- **Time-Window Tap Restriction**: Absensi sesi KBM untuk Guru dan Siswa dibatasi dalam jendela waktu persiapan, yaitu maksimal 15 menit sebelum `waktu_mulai` sesi hingga sesi berakhir/ditutup. Tap yang dicoba lebih awal dari batas 15 menit sebelum jam mulai akan diblokir dengan pesan error guna melindungi integritas pencatatan keterlambatan dan poin kehadiran.

### 3. Penugasan Petugas Kelas
- **Organizational Based**: Petugas kelas diangkat melalui posisi `PETUGAS_KELAS` pada `OrganizationalAssignment`.
- **Validity Period**: Penugasan memiliki `start_date` dan `end_date`. Petugas hanya dapat mengelola absensi kelasnya selama masa tugas aktif.

### 4. Smart Scheduling & Manual Entry
- **Fuzzy Matching**: Nama Guru, Mapel, dan Kelas dari Excel dipetakan menggunakan algoritma `findBestMatch`.
- **Upsert Logic**: Jika ditemukan jadwal dengan Kelas, Hari, dan Jam Mulai yang sama, sistem akan memperbarui (Update) data Mapel dan Guru daripada membuat data baru.
- **Manual Priority**: Status `IZIN`, `SAKIT`, `ALPA`, atau `DISPEN` yang diinput secara manual akan diupdate langsung ke level gerbang dan dipropagasi ke sesi aktif. Ketika status terekam, data antrean siswa "Masih Dinanti" akan seketika di-update via event socket (`attendance_feed_update`, `gerbang_tap_update`) untuk langsung menyembunyikan siswa tersebut dari daftar belum hadir secara real-time.
- **Normalization**: Sistem secara otomatis menormalisasi status ketidakhadiran (misal: `ALFA` menjadi `ALPA`) untuk konsistensi data.

### 5. Reporting & Analytics
- **Merge Logic**: Dalam laporan bulanan, status "HADIR" final dihitung jika siswa hadir di gerbang DAN hadir di mayoritas sesi kegiatan hari tersebut (tergantung konfigurasi tenant).
- **Attendance Points**: 
  - `HADIR_TEPAT_WAKTU`: Poin normal.
  - `TERLAMBAT`: Pengurangan poin otomatis.
  - `ALPA`: Pengurangan poin maksimal.

### 6. Special Cases & Exceptions
- **Priority**: Status `DISPEN`, `SAKIT`, atau `IZIN` dari modul Kejadian Khusus akan menimpa (Override) status absensi otomatis dari gerbang maupun sesi kegiatan.
- **Ignore Late**: Kejadian khusus dapat dikonfigurasi dengan opsi `abaikan_terlambat` untuk memberikan toleransi pada hari-hari tertentu.
- **Inheritance Attendance (Warisan Kehadiran)**:
  - Ketika status absensi pada sesi dengan tipe `PEMBIASAAN` (misal: Latihan Ketarunaan, Apel Pagi) diperbarui, status kehadiran tersebut akan langsung diwariskan/disinkronisasikan secara otomatis ke seluruh sesi KBM yang waktunya bertumpang tindih (overlap).
  - Status warisan tersebut dicatat di sesi KBM dengan menyertakan keterangan `Warisan Ketarunaan — [Nama Kegiatan] ([Waktu Pelaksanaan])` pada kolom catatan/keterangan absensi siswa.
  - Sesi KBM yang telah menerima status warisan dibebaskan dari penetapan status ALPA otomatis oleh *Auto-Close Job* di akhir hari.
