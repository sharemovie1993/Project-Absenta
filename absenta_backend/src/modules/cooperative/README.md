# MODULE COOPERATIVE

## Deskripsi
Modul Cooperative adalah sistem manajemen koperasi sekolah yang terintegrasi penuh dengan data akademik (Guru & Siswa) serta sistem akuntansi platform Absenta.id. Modul ini mencakup fungsi simpan pinjam, unit usaha (toko), layanan digital (PPOB), hingga pembagian Sisa Hasil Usaha (SHU) secara otomatis.

## Aktor & Peran
- **Pengurus Koperasi**: Pengelola utama yang memiliki wewenang persetujuan pinjaman, manajemen produk toko, dan kalkulasi SHU.
- **Kasir Toko**: Petugas khusus untuk melayani transaksi Point of Sale (POS) dan stok opname.
- **Anggota (Guru/Siswa/Staf)**: Pemilik rekening simpanan, pemohon pinjaman, dan penerima SHU.
- **Admin Sekolah**: Pengatur kebijakan global koperasi (bunga, alokasi SHU, dan kategori simpanan).

## Sub-Modul & Fitur Terimplementasi

### 1. Keanggotaan (Member)
- **Unified Identity**: Link otomatis ke data `Siswa`, `Guru`, atau `User` eksternal.
- **Auto-Increment ID**: Penomoran anggota otomatis per tenant.
- **Transaction PIN**: Keamanan tambahan 6-digit PIN untuk transaksi finansial sensitif.

### 2. Simpan Pinjam (Core Banking)
- **Simpanan**: Multi-kategori (Pokok, Wajib, Sukarela) dengan integrasi jurnal otomatis (Double-entry).
- **Pinjaman**: Alur persetujuan (PENDING -> APPROVED/REJECTED), perhitungan bunga flat, dan penjadwalan cicilan otomatis.
- **Anti-Self-Approval**: Proteksi sistem yang mencegah pengurus menyetujui transaksi miliknya sendiri.

### 3. Unit Usaha & Layanan Digital
- **Toko Koperasi**: Manajemen produk dengan pelacakan stok, kategori, dan integrasi akuntansi pada setiap penjualan.
- **PPOB**: Simulasi transaksi layanan digital (Pulsa, Paket Data, dll) dengan status transaksi real-time.
- **Voucher & Point**: Sistem loyalitas anggota melalui akumulasi poin belanja yang dapat ditukarkan menjadi voucher diskon pribadi.
- **Helpdesk Ticket**: Sistem bantuan terintegrasi bagi anggota untuk melaporkan masalah atau pertanyaan terkait layanan koperasi.

### 4. SHU (Sisa Hasil Usaha)
- **Configurable Allocation**: Pengaturan porsi jasa modal, jasa transaksi, cadangan, pengurus, dan sosial (Total 100%).
- **Automated Calculation**: Kalkulasi SHU berbasis partisipasi modal (Simpanan) dan partisipasi ekonomi (Volume Transaksi/Pinjaman).
- **Period Management**: Siklus tahunan SHU mulai dari Draft, Kalkulasi, hingga Distribusi.

### 5. Laporan & Akuntansi (Core ERP)
- **Accounting Integration**: Setiap transaksi finansial menghasilkan entri jurnal otomatis ke COA (Chart of Accounts) tenant.
- **Standard COA**: Penggunaan kode akun standar (1010-Kas, 1020-Piutang, 2010-Simpanan, dll) untuk otomatisasi pembukuan.
- **Laporan Keuangan**: Neraca saldo, laba rugi, dan rekapitulasi simpan pinjam per periode.

## Teknologi & Pattern
- **Pattern**: Service Layer, Transactional Guard, State Machine (untuk Loan).
- **Security**: PIN Hashing (Bcrypt), Data Scope Restriction, Audit Logging.
- **Integrasi**: `AccountingService` untuk sinkronisasi data keuangan ke buku besar.
