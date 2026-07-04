# 📋 Centralized Reporting Engine (Modul Pelaporan & PDF)

Modul **Reporting** bertindak sebagai mesin pelaporan terpusat (Reporting Engine) pada platform Absenta.id. Modul ini bertanggung jawab untuk menarik data dari berbagai modul lain (seperti Kesiswaan, Hubin, Kurikulum, dan Billing) dan memformatnya menjadi dokumen siap cetak dalam format PDF maupun ekspor data tabular (CSV/JSON).

---

## 🛠️ Arsitektur & Teknologi

1. **HTML-to-PDF Converter (Puppeteer)**:
   Menggunakan chromium headless secara aman (`--no-sandbox`) untuk me-render template HTML berdesain CSS modern menjadi file PDF mentah (buffer) yang langsung dikirimkan ke browser client untuk diunduh/dicetak.
2. **Data Aggregator**:
   Menarik data lintas modul (misal: relasi database Siswa, Guru, Supervisi, atau data tagihan lisensi eksternal via API proxy) untuk meminimalisasi duplikasi logika cetak di modul-modul individu.

---

## 🔌 Dokumentasi Endpoint API

### 1. Ekspor Data Laporan (JSON/CSV)
- **`POST /reporting/financial/generate`**: Menghasilkan data ringkasan keuangan bulanan sekolah.
- **`GET /reporting/financial/export`**: Mengunduh file CSV ringkasan tagihan sekolah berdasarkan rentang tanggal.
- **`GET /reporting/kesiswaan`**: Rekap total poin pelanggaran siswa per kelas untuk guru BK/Kesiswaan.
- **`GET /reporting/hubin`**: Laporan status penempatan PKL aktif siswa di mitra industri.
- **`GET /reporting/kurikulum`**: Laporan status keaktifan akademik siswa per tahun ajaran.

### 2. Dokumen PDF Siap Cetak (Reporting Engine)
- **`GET /reporting/pdf/certificate/:siswaId`**: Mencetak sertifikat penghargaan/kelulusan siswa (A4 Landscape, desain ornamen emas).
- **`GET /reporting/pdf/invoice/:invoiceNumber`**: Mencetak invoice lisensi pemakaian modular Absenta.id (A4 Portrait, lengkap dengan stamp status pembayaran LUNAS/JATUH TEMPO).
- **`GET /reporting/pdf/supervision/:supervisionId`**: Mencetak lembar laporan resmi hasil supervisi akademik guru oleh Kepala Sekolah/Kurikulum (A4 Portrait, lengkap dengan kartu skor dan evaluasi predikat).
