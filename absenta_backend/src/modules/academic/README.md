# MODULE ACADEMIC

## Deskripsi
Modul Academic adalah inti dari platform Absenta.id yang mengelola data dasar operasional sekolah. Modul ini menggunakan arsitektur **Stateless JWT** dengan pemisahan logic antara **Command** (perubahan) dan **Query** (pengambilan data) pada entitas kritis, serta sistem **Organizational Assignment** yang fleksibel untuk manajemen peran struktural.

## Aktor & Peran
- **System Superadmin**: Akses lintas tenant untuk manajemen infrastruktur dan seeding data master platform.
- **Admin Sekolah**: Pengelola penuh data akademik, konfigurasi kartu pelajar, dan eksekusi transisi tahun ajaran.
- **Guru & Staf**: Subjek manajemen kepegawaian, pengampu mata pelajaran, dan pemegang jabatan struktural.
- **Wali Kelas**: Peran dinamis yang ditentukan melalui penugasan organisasi terhadap kelas tertentu.
- **Siswa**: Subjek utama proses akademik, mulai dari pendaftaran hingga kelulusan.

## Sub-Modul & Fitur Terimplementasi

### 1. Manajemen Siswa & Akademik
- **Siswa (Advanced)**: CRUD dengan history audit, timeline aktivitas, manajemen dokumen, dan exit bundle.
- **Snapshot Akademik**: Sistem snapshot `SiswaAkademik` per semester untuk menjaga integritas data historis.
- **Transition & Kenaikan**: Engine transisi akhir tahun ajaran (NAIK, TINGGAL, PINDAH, LULUS) dengan validasi ketat (Gatekeepers).

### 2. Sumber Daya Manusia (SDM)
- **Manajemen Guru**: Profil lengkap guru terintegrasi dengan akun User, NIP, dan sistem RFID.
- **Penugasan Mapel**: Hubungan guru dengan mata pelajaran yang diampu, didukung fitur **Smart Match** (Fuzzy matching) untuk import Excel.
- **Struktur Organisasi**: Engine hirarki posisi (Kepsek, Waka, Kaprog, Walikelas, dll) dengan sistem auto-filling cerdas berdasarkan Jurusan/Kelas.

### 3. Struktur Dasar & Kurikulum
- **Tahun Pelajaran & Semester**: Validasi format tahun berurutan dan status operasional semester (Strict Status).
- **Kelas & Jurusan**: Pengelompokan siswa dengan integrasi otomatis ke modul Sarpras.
- **Mata Pelajaran**: Manajemen repositori mapel per tingkat pendidikan.
- **Jenis Kegiatan Master**: Master data kategori kegiatan (KBM, Pembiasaan, Eskul) dengan seeding default otomatis.

### 4. Utilitas & Pendukung
- **Prep Checklist**: Sistem panduan kesiapan operasional tahun ajaran baru (Cek rombel, guru, transisi siswa, hingga penugasan struktural).
- **Student Card Config**: Editor visual untuk desain kartu pelajar (QR, Photo, Layout) dan konfigurasi cetak massal.
- **Backup & Restore**: Export/Import seluruh data akademik tenant dalam format JSON untuk keamanan data.
- **Universal Search**: Pencarian cepat lintas entitas (Siswa, Guru) berdasarkan nama, NIS/NIP, atau RFID.

## Teknologi & Pattern
- **Pattern**: Repository Pattern, Command/Query Separation, Service Layer, Contextual Authorization.
- **Integrasi**: Terhubung erat dengan modul Auth (Organizational Scope), Sarpras (Location mapping), dan Attendance (Jadwal).
- **Database**: Prisma ORM dengan PostgreSQL, didukung caching organizational context.
