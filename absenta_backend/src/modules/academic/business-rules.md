# BUSINESS RULES - ACADEMIC

### 1. Multi-Tenancy & Data Isolation
- **Tenant Scope**: Setiap transaksi database wajib difilter berdasarkan `tenant_id`.
- **Immutability of History**: Data snapshot (`SiswaAkademik`) tidak boleh diubah secara manual setelah semester berjalan untuk menjaga validitas laporan historis.
- **Data Sanitization**: Proses Restore data wajib melakukan validasi keberadaan `user_id` di tenant target untuk mencegah kegagalan referensial.
- **Cache Invalidation**: Setiap perubahan pada `OrganizationalPosition` atau `OrganizationalAssignment` wajib melakukan invalidasi cache pada `organizationalContextCache` dan `sidebarRenderingService` untuk memastikan perubahan hak akses segera berlaku.

### 2. Manajemen Guru & Jabatan
- **Structural Identity**: Guru dapat memiliki lebih dari satu jabatan (misal: Guru Mapel sekaligus Wali Kelas). Identitas ini diresolusi secara real-time melalui `OrganizationalAssignment`.
- **Profile Enrichment**: Endpoint `/me` guru secara otomatis menggabungkan data profil dengan daftar jabatan aktif, unit jurusan, dan kelas binaan.
- **RFID Assignment**: Satu nomor RFID hanya boleh terikat pada satu guru/siswa aktif dalam satu tenant.

### 3. Smart Import (Excel)
- **Fuzzy Matching**: Sistem menggunakan algoritma `findBestMatch` untuk memetakan nama Guru atau Mapel dari Excel ke database, mengurangi kegagalan akibat typo ringan.
- **Match Priority**: Pemetaan Mapel memprioritaskan kecocokan Nama, kemudian Kode Mapel jika nama tidak ditemukan.

### 4. Struktur Organisasi Cerdas
- **Position Binding**: Posisi seperti `KAPROG` (Ketua Program) secara otomatis terikat pada entitas `Jurusan`, sedangkan `WALIKELAS` terikat pada `Kelas`.
- **Auto-Tree Generation**: Struktur pohon organisasi secara otomatis menampilkan slot kosong untuk entitas yang belum memiliki pejabat (Kepala Jurusan yang belum di-set tetap muncul dalam daftar slot Jurusan).

### 5. Transisi & Kesiapan Operasional (Year-End)
- **Gatekeepers**: Transisi tahun ajaran hanya dapat dieksekusi jika:
  - Semester aktif saat ini adalah semester GENAP (2).
  - Tahun ajaran baru sudah dibuat namun BELUM AKTIF.
  - Tidak ada sesi absensi yang masih menggantung (BERLANGSUNG/AKTIF).
- **Prep Checklist Logic**: Sistem secara otomatis mengidentifikasi "Target Year" sebagai tahun terbaru yang belum aktif dan "Target Semester" sebagai semester Ganjil pada tahun tersebut.
- **Transition Order**: Kenaikan kelas siswa lama (XI/XII) WAJIB dilakukan sebelum registrasi siswa baru (PPDB tingkat X) untuk memastikan ketersediaan slot rombel.
- **Graduation Logic**: Siswa dengan status `LULUS` akan dikunci pada tahun kelulusannya dan tidak dipindahkan ke snapshot tahun ajaran baru.

### 6. Kurikulum & Master Data
- **Default Seeding**: Tenant baru secara otomatis mendapatkan daftar `JenisKegiatanMaster` standar (KBM, Upacara, Apel, Eskul) untuk mempercepat setup awal.
- **Subject Uniqueness**: Mata pelajaran bersifat unik berdasarkan kombinasi `tenant_id`, `nama_mapel`, dan `tingkat`.
