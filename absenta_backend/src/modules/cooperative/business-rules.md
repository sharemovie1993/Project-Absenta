# BUSINESS RULES - COOPERATIVE

### 1. Keanggotaan (Membership)
- **Unique Link**: Satu entitas (Siswa/Guru) hanya boleh terdaftar sebagai satu anggota koperasi dalam satu tenant.
- **PIN Security**: Setiap transaksi finansial (penarikan, pembayaran voucher) wajib divalidasi dengan 6-digit PIN numerik.
- **Auto-Completion**: Saat pendaftaran anggota, sistem secara otomatis melengkapi profil inti (alamat, no hp) pada data Siswa/Guru jika data tersebut kosong.

### 2. Simpanan (Savings)
- **Pokok Rule**: Simpanan Pokok hanya boleh dibayarkan satu kali selama masa keanggotaan. Setoran tambahan untuk kategori 'POKOK' akan ditolak sistem.
- **Withdrawal Restriction**: Simpanan kategori 'POKOK' dan 'WAJIB' tidak diperbolehkan untuk ditarik (Withdrawal) selama status anggota masih aktif.
- **Negative Balance Prevention**: Saldo simpanan tidak diperbolehkan negatif. Penarikan atau biaya admin akan ditolak jika saldo tidak mencukupi.
- **Self-Transaction Guard**: Operator (Pengurus) dilarang melakukan transaksi setoran atau penarikan pada akun simpanan milik mereka sendiri.

### 3. Pinjaman (Loans)
- **Single Active Loan**: Anggota dilarang mengajukan pinjaman baru jika masih memiliki pinjaman aktif (status: APPROVED) yang belum lunas.
- **Single Pending Application**: Anggota dilarang membuat pengajuan baru jika masih ada pengajuan yang berstatus PENDING (sedang ditinjau).
- **Rounding Logic**: Pembulatan cicilan dilakukan ke bawah (floor) untuk setiap bulan, dan selisih pembulatan dibebankan seluruhnya pada cicilan bulan terakhir.
- **Approval Guard**: Pengurus dilarang menyetujui (Approve) atau menolak (Reject) pengajuan pinjaman atas nama diri mereka sendiri.

### 4. Unit Usaha Toko (Store) & Loyalitas
- **Integrity Protection**: Produk yang sudah memiliki riwayat penjualan tidak dapat dihapus permanen. Sistem mewajibkan penonaktifan produk (stok = 0) untuk menjaga integritas laporan keuangan.
- **Journal Adjustment**: Setiap perubahan stok manual (Stock Opname) wajib mencatat jurnal penyesuaian otomatis terhadap akun Persediaan (1030) dan Beban Admin (5020).
- **Non-Negative Stock**: Sistem menolak transaksi penjualan atau penyesuaian stok yang mengakibatkan saldo stok produk menjadi negatif.
- **Point Redemption**: Penukaran poin menjadi voucher hanya tersedia dalam paket tetap (500, 1000, atau 2000 poin). Penukaran poin di luar paket tersebut akan ditolak.
- **Voucher Ownership**: Voucher hasil penukaran poin bersifat pribadi (Private) dan hanya dapat digunakan oleh anggota pemiliknya.

### 5. Sisa Hasil Usaha (SHU) & Keuangan
- **100% Allocation**: Total persentase alokasi SHU (Jasa Modal + Jasa Transaksi + Cadangan + Pengurus + Sosial + Pembangunan) wajib berjumlah tepat 100%.
- **Calculation Logic**: 
  - **Jasa Modal**: Dihitung dari proporsi simpanan modal anggota terhadap total modal koperasi.
  - **Jasa Transaksi**: Dihitung dari proporsi volume partisipasi ekonomi anggota (Total Deposit + Total Pinjaman) terhadap total volume partisipasi seluruh anggota.
- **Status Locking**: Periode SHU yang sudah disetujui (APPROVED) atau didistribusikan (DISTRIBUTED) tidak dapat dikalkulasi ulang atau dihapus.
- **Transactional Consistency**: Setiap perubahan finansial wajib melalui `AccountingService` untuk inisialisasi COA (Kas, Piutang, Hutang, Ekuitas) sebelum transaksi database dilakukan untuk mencegah kegagalan referensial.

### 6. PPOB & Bantuan (Support)
- **Tenant Validation**: Produk PPOB yang diakses wajib terdaftar dan aktif pada tenant yang bersangkutan.
- **Transaction Simulation**: Status transaksi dimulai dari PENDING dan akan diperbarui melalui sistem callback (simulasi status sukses/gagal).
- **Ticket Lifecycle**: Tiket bantuan yang baru dibuat secara otomatis berstatus `OPEN`. Setiap balasan dari staf akan mengubah status tiket menjadi `IN_PROGRESS` untuk pelacakan respons.
