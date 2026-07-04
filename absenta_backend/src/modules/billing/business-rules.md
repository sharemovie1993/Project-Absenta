# BUSINESS RULES - BILLING

### 1. Tenant Entitlements (Hak Akses Fitur)
- **Core Access**: Fitur dengan kode `CORE` bersifat bawaan (Default) dan selalu diberikan kepada setiap tenant terdaftar tanpa memerlukan langganan aktif.
- **Entitlement Resolution**: Daftar fitur tenant diresolusi dari gabungan seluruh langganan yang memiliki status `ACTIVE`, `TRIAL`, atau `UPGRADE_PENDING`.
- **Normalization**: Seluruh kode fitur diubah menjadi format **Uppercase** (misal: `koperasi` menjadi `KOPERASI`) untuk menjamin konsistensi pengecekan izin.
- **Cache Policy**: Hasil resolusi fitur disimpan dalam cache Redis dengan durasi 60 detik. Perubahan langganan wajib memicu instruksi `invalidateTenantFeaturesCache`.

### 2. Manajemen Paket (Plans)
- **Priority Sourcing**: Sistem memprioritaskan pengambilan data paket dari server lisensi pusat (`LICENSE_SERVER_URL`). Data lokal hanya digunakan jika terjadi gangguan koneksi atau *timeout* pada API eksternal.
- **Auto-Tiering**: Paket diklasifikasikan berdasarkan batasan pengguna:
  - **Micro**: Max 100 pengguna.
  - **Small**: Max 300 pengguna.
  - **Medium**: Max 600 pengguna.
  - **Large**: Max 1200 pengguna.
  - **Enterprise**: Di atas 1200 pengguna atau tanpa batasan.
- **Mode Attendance**: Paket khusus modul Absensi secara otomatis mengatur parameter `absensi_mode` pada tenant menjadi `MULTI_SESI` jika nama paket mengandung kata "Multi Sesi".

### 3. Siklus Billing & Invoice
- **Invoice Numbering**: Setiap invoice menggunakan format `INV-YYYY-MM-[RANDOM_4_DIGIT]` untuk menjamin keunikan identitas tagihan.
- **Due Date Policy**: Batas waktu pembayaran (Due Date) secara default ditetapkan 3 hari setelah tanggal penagihan, kecuali dikonfigurasi lain melalui `process.env.DUE_DAYS`.
- **Status Progression**: Invoice yang melewati `due_date` tanpa status `PAID` secara otomatis akan ditandai sebagai `OVERDUE` melalui proses pengecekan berkala.
- **Financial Precision**: Seluruh perhitungan jumlah tagihan (`amount`) menggunakan tipe data numerik yang mendukung akurasi mata uang (IDR).
- **Audit Trail**: Setiap perubahan status invoice (misal: dari Unpaid ke Paid) wajib mencatat referensi pembayaran dan identitas petugas yang mengonfirmasi.

### 4. Subscription & Change Management
- **Trial Restriction**: Satu tenant hanya diperbolehkan mengambil satu kali masa percobaan (Trial) untuk setiap kategori layanan (`service_code`).
- **End Date Logic**: Masa aktif langganan dihitung berdasarkan `end_date`. Sistem menganggap langganan kadaluwarsa segera setelah waktu saat ini melampaui `end_date`.
- **Change Queue**: Perubahan paket (Upgrade/Downgrade) saat ini ditangani sebagai permintaan terjadwal (`SCHEDULED`) yang akan dieksekusi secara otomatis oleh sistem saat mencapai `effective_date`.
- **Health Guard**: Sistem terus memantau anomali seperti tenant aktif tanpa invoice lunas atau invoice yang masa aktifnya tumpang tindih.
