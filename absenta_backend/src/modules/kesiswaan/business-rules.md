# BUSINESS RULES - KESISWAAN

### 1. Manajemen Poin & Pelanggaran
- **Akumulasi Poin**: Poin pelanggaran dihitung secara kumulatif dalam satu tahun pelajaran aktif.
- **Kategorisasi Strict**: Pelanggaran dibagi menjadi tiga kategori utama:
  - **Ringan (5-10 poin)**: Masalah kedisiplinan harian (seragam, terlambat).
  - **Sedang (15-30 poin)**: Gangguan KBM dan perilaku merugikan (bolos, merokok, HP).
  - **Berat (50-100 poin)**: Tindakan kriminal atau asusila (berkelahi, narkoba, mencuri).
- **Status Lifecycle**: Setiap catatan pelanggaran baru secara default memiliki status `BARU`. Status ini dapat diperbarui menjadi status pembinaan lainnya sesuai kebijakan sekolah.
- **Snapshot Integrity**: Catatan pelanggaran wajib mencatat `siswa_akademik_id` untuk mengunci konteks kelas dan tahun ajaran saat kejadian berlangsung.
- **Default Seeding**: Tenant baru mendapatkan master data pelanggaran secara otomatis melalui `tenant-created.consumer` guna menjamin standarisasi poin awal.

### 2. Manajemen Prestasi
- **Reward Poin**: Prestasi memberikan poin positif yang dapat digunakan sebagai pembanding (offset) terhadap poin pelanggaran dalam laporan kepribadian siswa.
- **Kategori Prestasi**:
  - **Akademik**: Juara kelas, lomba KSN/OSN.
  - **Non-Akademik**: Juara olahraga dan seni.
  - **Keorganisasian**: Keaktifan di OSIS/MPK/Paskibraka.
  - **Karakter**: Hafizh Qur'an dan penghargaan siswa teladan.
- **Auto-Seeding Available**: Admin dapat memicu pemuatan data prestasi standar secara manual melalui fungsi `seedDefaults` di dashboard pengaturan.
- **Master Data Achievement**: Tenant didorong menggunakan `DEFAULT_JENIS_PRESTASI` untuk menjaga konsistensi pemberian poin antar sekolah.

### 3. Operasional Piket (Izin Keluar)
- **Status Workflow**: Izin dimulai dengan status `DISETUJUI` saat siswa keluar, dan berubah menjadi `KEMBALI` secara otomatis saat guru piket mencatat jam kembali siswa.
- **Daily Monitoring Scope**: Laporan piket harian mencakup seluruh siswa yang melakukan izin pada rentang waktu `00:00:00` hingga `23:59:59` pada tanggal yang dipilih.
- **Active Academic Check**: Sistem hanya mengizinkan pembuatan surat izin bagi siswa yang memiliki data akademik aktif (`status: 'AKTIF'`) pada semester berjalan.
- **Identity Resolution**: Jika ID yang diberikan saat pembuatan izin adalah ID Siswa dasar, sistem akan secara otomatis melakukan *lookup* ke tabel `SiswaAkademik` yang aktif.

### 4. Keamanan & Akses Data
- **Data Scoping**: 
  - **Admin**: Akses penuh lintas kelas dalam satu tenant.
  - **Wali Kelas**: Dibatasi hanya untuk siswa di kelas binaannya sendiri (diatur melalui `applyDataScope`).
  - **Student View**: Siswa hanya dapat melihat riwayat pelanggaran dan prestasinya sendiri.
- **Audit Logging**: Setiap aksi hapus (Delete) pada data pelanggaran atau prestasi wajib divalidasi kepemilikannya berdasarkan `tenant_id` untuk mencegah *cross-tenant data deletion*.

### 5. Jadwal Kegiatan & Keanggotaan Eskul
- **Domain Ownership**: Jadwal Kegiatan adalah milik domain Kesiswaan (bukan Attendance). Fitur ini bersifat GRATIS dan diakses melalui namespace `/api/kesiswaan/jadwal-kegiatan`.
- **Capability Authorization**: Seluruh akses ke Jadwal Kegiatan, Anggota Eskul, dan Pembina Eskul divalidasi menggunakan capability domain `kesiswaan.schedules.*`.
- **Role Access**:
  - **KESISWAAN (Wakasek Kesiswaan)**: Full CRUD (`kesiswaan.schedules.create`, `.update`, `.delete`, `.view.list`).
  - **PEMBINA_ESKUL**: Read-only (`kesiswaan.schedules.view.list`).
  - **WALIKELAS**: Read-only (`kesiswaan.schedules.view.list`).
  - **GURU, KURIKULUM & SISWA**: Read-only baseline (`kesiswaan.schedules.view.list`).
- **Auto-Session Integration**: Jadwal kegiatan yang dibuat melalui modul ini tetap menggunakan `attendanceAutoSession.job.ts` di Attendance Engine untuk pembuatan sesi absensi otomatis harian.
