# 📜 Aturan Bisnis (Business Rules) - Modul Reporting

Modul Reporting harus mematuhi aturan bisnis dan standar keamanan data platform berikut:

---

## 1. Isolasi Data Multi-Tenant (Mandatory)
- **Tenant Scope Enforcement**: Seluruh proses penarikan data untuk laporan keuangan, sertifikat siswa, maupun hasil supervisi guru WAJIB menggunakan filter `tenant_id` dari token otentikasi user (`request.tenantId`).
- User dari sekolah (tenant) A **tidak boleh** mengakses, mengekspor, atau mengunduh PDF laporan dari sekolah (tenant) B.

## 2. Hak Akses & Kemampuan (Capabilities)
Setiap endpoint pelaporan harus dilindungi oleh middleware `requireCapability` dengan ketentuan:
- Laporan Keuangan/Invoice: Memerlukan capability `reports.financial.view.monthly` atau `reports.financial.generate`.
- Sertifikat Siswa: Memerlukan capability `reports.violation.view` (kesiswaan/BK).
- Hasil Supervisi: Memerlukan capability `curriculum.supervision.view.report` (kurikulum/kepsek).

## 3. Aturan Desain & Tata Letak Dokumen PDF
- **Sertifikat Siswa**: 
  - Wajib menggunakan orientasi halaman **Landscape** (A4).
  - Wajib mencantumkan NIS, Nama Lengkap Siswa, Nama Sekolah, Tanggal Terbit, dan tempat tanda tangan basah Kepala Sekolah.
- **Invoice Tagihan**:
  - Wajib menggunakan orientasi halaman **Portrait** (A4).
  - Wajib menampilkan stempel status visual (LUNAS dalam warna hijau, BELUM BAYAR dalam warna abu-abu, JATUH TEMPO dalam warna merah).
- **Laporan Supervisi Guru**:
  - Wajib menampilkan predikat berdasarkan skor numerik:
    - Skor 90 - 100: `SANGAT BAIK`
    - Skor 80 - 89: `BAIK`
    - Skor 70 - 79: `CUKUP`
    - Skor < 70: `Perlu Pembinaan`

## 4. Keandalan Rendering PDF (Puppeteer)
- Eksekusi Puppeteer wajib menggunakan flags `--no-sandbox` dan `--disable-setuid-sandbox` agar dapat berjalan lancar di server Linux/Docker produksi.
- Blok `try ... finally` wajib digunakan untuk menjamin browser instance Puppeteer ditutup (`browser.close()`) setelah proses cetak selesai untuk mencegah kebocoran memori (memory leak).
