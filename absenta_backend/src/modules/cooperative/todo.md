# TODO COOPERATIVE

## High Priority
- [x] **E-Wallet RFID Integration**: Implementasi pembayaran cashless via RFID yang terintegrasi dengan Simpanan Sukarela dan Double-entry Journaling.
- [x] **Selesaikan Distribusi SHU**: Implementasi final untuk proses posting otomatis SHU yang telah disetujui ke rekening simpanan anggota masing-masing (didistribusikan ke tabungan Sukarela & pencatatan jurnal akuntansi ganda).
- [ ] **Refactoring POS UI**: Memperbarui antarmuka Point of Sale (POS) untuk mendukung pemindaian barcode produk yang lebih cepat.
- [x] **Validation Layer (Zod)**: Menambahkan skema validasi Zod pada seluruh endpoint finansial (Loan Application, Saving Transaction, PPOB).
- [ ] **Standardisasi Jurnal POS**: Menambahkan detail jurnal untuk Pajak Penjualan (jika ada) dan Diskon pada transaksi toko.
- [ ] **Advanced Helpdesk**: Menambahkan notifikasi email/push kepada anggota saat tiket bantuan mereka dibalas oleh staf.

## Medium Priority
- [ ] **Mobile Integration**: Menghubungkan fitur cek saldo, pengajuan pinjaman, dan penukaran poin ke aplikasi Parent/Student.
- [ ] **Advanced PPOB Integration**: Integrasi dengan provider PPOB riil (via API callback) untuk menggantikan sistem simulasi saat ini.
- [ ] **Laporan Akuntansi Standar**: Penambahan laporan Neraca (Balance Sheet) dan Laporan Perubahan Ekuitas yang memenuhi standar akuntansi koperasi.
- [ ] **Voucher Redemption Flow**: Menyempurnakan alur penukaran voucher belanja anggota dengan validasi stok voucher yang lebih ketat.
- [ ] **Point Multiplier**: Implementasi pengali poin (Bonus Point) untuk kategori produk tertentu atau periode promosi.

## Low Priority
- [ ] **Analitik SHU Forecast**: Fitur untuk memprediksi potensi SHU di tengah periode berjalan berdasarkan tren pendapatan saat ini.
- [ ] **Cetak Bukti Transaksi**: Integrasi dengan printer thermal untuk cetak struk penjualan toko dan bukti setoran simpanan.
- [ ] **Bulk Import Anggota**: Penambahan fitur import data anggota koperasi dari file Excel dengan pemetaan otomatis ke data Siswa/Guru yang sudah ada.
- [ ] **Gamifikasi Point**: Sistem peringkat anggota berdasarkan loyalitas belanja dan keaktifan menabung.
