# BUSINESS RULES - SARPRAS

### 1. Keamanan & Cakupan Data (Enterprise Scoping)
- **Tenant Isolation**: Setiap transaksi wajib difilter berdasarkan `tenant_id`. Data antar sekolah terisolasi sepenuhnya.
- **Unit Restricted Access**: Pengguna dengan akses terbatas unit (misal: Kaprog) hanya dapat mengelola lokasi dan aset yang berada di bawah unit kerjanya.
- **Ownership Guard**: Setiap aksi pembaruan atau penghapusan aset, lokasi, dan peminjaman wajib memvalidasi kepemilikan data berdasarkan `tenant_id` dan cakupan unit operator.

### 2. Manajemen Inventaris & Aset
- **Uniqueness**: Kode aset bersifat unik dalam satu tenant. Sistem menolak duplikasi kode aset lintas unit pada tenant yang sama.
- **Auto Code Format**: Kode unik yang digenerate sistem mengikuti format `INV-[TAHUN]-[5_KARAKTER_RANDOM]` dengan menghindari karakter yang membingungkan (seperti 0, O, 1, I).
- **Automatic Restore**: Import aset menggunakan kode yang sudah ada (pernah dihapus) akan secara otomatis memulihkan (Restore) aset tersebut daripada membuat data ganda.
- **Soft Delete**: Penghapusan kategori, lokasi, dan aset menggunakan mekanisme `deleted_at`. Data tidak dihapus permanen untuk menjaga integritas riwayat peminjaman dan perbaikan.

### 3. Aturan Peminjaman (Loan Rules)
- **Eligibility Check**: Aset hanya dapat dipinjam jika:
  - Berstatus `is_loanable: true`.
  - Kondisi aset bukan `RUSAK` (Rusak Berat).
  - Stok tersedia (Jumlah aset > jumlah peminjaman aktif/APPROVED).
- **Borrower Validation**: Identitas peminjam divalidasi silang terhadap database Siswa (harus berstatus AKTIF), Guru, atau Staf. Pencarian identitas mendukung pencocokan pada NIS/NIP, RFID (case-insensitive), Email, atau UUID.
- **Sequential Workflow**: Status peminjaman tidak dapat langsung menjadi `ACTIVE` tanpa melalui status `APPROVED` (kecuali oleh operator dengan wewenang khusus).
- **Return Integrity**: Saat pengembalian, jika aset dilaporkan `RUSAK`, sistem secara otomatis memperbarui status kondisi aset master menjadi `RUSAK`.

### 4. Aturan Perbaikan (Repair Rules)
- **Automatic Condition Lock**: Saat aset didaftarkan dalam perbaikan (`status: PROSES`), kondisi aset pada master data dikunci menjadi `PERBAIKAN` untuk mencegah peminjaman.
- **Restoration Logic**: Kondisi aset hanya akan dikembalikan menjadi `BAIK` jika perbaikan berstatus `SELESAI` DAN tidak ada proses perbaikan lain yang masih berjalan (`PROSES`) untuk aset tersebut.
- **Cancellation Effect**: Jika perbaikan dibatalkan (`BATAL`), status kondisi aset master dikembalikan menjadi `RUSAK` (menunggu pelaporan perbaikan baru).

### 5. Audit & Keuangan
- **Audit Logging**: Setiap aksi `CREATE`, `UPDATE`, `DELETE`, `IMPORT`, `LOAN`, dan `REPAIR` wajib mencatat log kejadian lengkap dengan metadata perubahan untuk keperluan audit.
- **Financial Precision**: Data harga perolehan aset dan biaya perbaikan disimpan menggunakan tipe data `Decimal` untuk menjamin akurasi perhitungan finansial inventaris.
