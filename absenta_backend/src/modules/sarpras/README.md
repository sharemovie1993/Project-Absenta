# MODULE SARPRAS (Sarana dan Prasarana)

## Deskripsi
Modul Sarpras adalah sistem manajemen aset dan inventaris sekolah yang komprehensif di platform Absenta.id. Modul ini mencakup siklus hidup aset mulai dari pengadaan, penempatan lokasi, peminjaman oleh warga sekolah, hingga pemeliharaan dan perbaikan rutin.

## Aktor & Peran
- **Wakasek Sarpras**: Pengelola kebijakan global aset, kategori, dan peninjau statistik inventaris sekolah.
- **Inventarisator (Staf Sarpras)**: Pelaksana operasional CRUD aset, manajemen lokasi, dan persetujuan peminjaman.
- **Peminjam (Guru/Siswa/Staf)**: Pengguna fasilitas sekolah yang melakukan permohonan peminjaman aset.
- **Teknisi**: Pihak internal atau eksternal yang menangani proses perbaikan aset yang rusak.

## Sub-Modul & Fitur Terimplementasi

### 1. Manajemen Inventaris (Asset Management)
- **Kategori & Lokasi**: Pengelompokan aset berdasarkan jenis dan penempatan ruangan yang mendukung pembatasan akses berbasis unit kerja (Jurusan/Unit).
- **Asset Lifecycle**: CRUD aset dengan pelacakan kondisi (`BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT`, `PERBAIKAN`).
- **Auto Code Generation**: Pembuatan kode unik aset secara otomatis jika tidak disediakan manual.
- **Smart Bulk Import**: Import data aset massal dari Excel dengan resolusi otomatis kategori dan lokasi berdasarkan nama.

### 2. Sistem Peminjaman (Loan System)
- **Multi-Identity Borrower**: Mendukung peminjaman oleh Siswa (via NIS/RFID), Guru (via NIP/RFID), maupun Staf (via Email).
- **Availability Guard**: Pengecekan ketersediaan stok aset secara real-time sebelum permohonan diproses.
- **Loan Workflow**: Alur status peminjaman mulai dari `PENDING` -> `APPROVED` -> `ACTIVE` (Diambil) -> `RETURNED` (Dikembalikan).
- **Identity Scanner**: Fitur pencarian identitas peminjam yang robust menggunakan berbagai parameter identitas.

### 3. Pemeliharaan & Perbaikan (Repair System)
- **Repair Workflow**: Manajemen perbaikan aset dari status `PROSES` hingga `SELESAI` atau `BATAL`.
- **Condition Automation**: Perubahan status kondisi aset secara otomatis menjadi `PERBAIKAN` saat masuk bengkel dan kembali ke `BAIK` setelah perbaikan selesai.
- **Cost Tracking**: Pencatatan biaya perbaikan untuk keperluan audit finansial sarana sekolah.

### 4. Statistik & Reporting
- **Real-time Inventory Stats**: Dasbor ringkasan jumlah aset total, tersedia, sedang dipinjam, dan dalam perbaikan.
- **Audit Trail**: Pencatatan setiap aksi krusial (pembuatan, pembaruan, penghapusan, peminjaman) ke dalam log aktivitas sistem.

## Teknologi & Pattern
- **Pattern**: Service Layer, Transactional Guard, Scoped Querying.
- **Security**: Unit-Restricted Access (Jurisdictional Scope), Ownership Validation.
- **Integrasi**: `Academic Module` (Identity Resolution), `Activity Module` (Audit Logging).

## Pembedaan Kontekstual Lintas Workspace (Kurikulum vs Guru)
Halaman Peminjaman (`/sarpras/loans`) diintegrasikan secara dinamis berdasarkan Ruang Kerja aktif:
1. **Ruang Kerja Guru ("Peminjaman Saya")**:
   - Diperuntukkan secara personal bagi Guru yang sedang login.
   - Hanya menampilkan daftar aset yang dipinjam guru tersebut dan tombol untuk melakukan pengajuan peminjaman aset pribadi.
2. **Ruang Kerja Kurikulum ("Kelola Peminjaman Aset KBM")**:
   - Wakasek Kurikulum bertindak sebagai operator/admin inventaris sarana KBM (Infocus, Tablet, Laptop, HDMI, dsb.).
   - Menyediakan fitur scan barcode untuk serah terima/pengembalian aset secara cepat.
   - Menerapkan **Isolasi Aset KBM**: menyaring daftar transaksi & aset secara otomatis hanya untuk kategori pembelajaran/elektronik.

