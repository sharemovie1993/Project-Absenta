# 📐 ARCHITECTURAL DECISIONS (ADR) — MODUL KURIKULUM & PERANGKAT AJAR

---

## ADR-001: Cloud-Native Pure Vector PDF Stream Engine (Zero-Disk Footprint)

### Context & Problem
Menyimpan berkas PDF fisik `.pdf` pada disk storage server untuk setiap dokumen Perangkat Ajar (Modul Ajar, ATP, PROTA, PROMES, KKTP) buatan guru akan memicu pemborosan storage secara masif (1.000 guru x 10 dokumen = ~10.000 file PDF / puluhan GB sampah disk).

### Decision
1. **DILARANG** menyimpan berkas PDF fisik di disk storage server.
2. Seluruh naskah dokumen disimpan murni dalam bentuk **Metadata & HTML Terstruktur (`html_content`)** di database PostgreSQL (~10 KB per record).
3. Berkas PDF stream di-render secara *Cloud-Native / On-the-Fly* dalam RAM server via Puppeteer Headless Browser hanya pada detik saat pengguna meminta pratinjau / pencetakan.

### Consequences
- **Positive**: Menghemat storage disk server hingga **99.8%**, pemeliharaan backup database menjadi sangat ringan dan cepat.
- **Negative**: Memerlukan konsumsi RAM & CPU sementara saat Puppeteer me-render PDF stream. Dikelola via Puppeteer pool berkonfigurasi `waitUntil: 'domcontentloaded'`.

---

## ADR-002: Single Source of Truth Kop Surat Instansi (`PrintHeader`)

### Context & Problem
Terjadi ketidakcocokan Kop Surat jika Frontend React Preview, PDF Stream Backend, dan MS Word Exporter menggunakan template Kop Surat yang berbeda.

### Decision
Seluruh saluran keluaran (Pratinjau React, PDF Stream Puppeteer, dan Ekspor Word) **WAJIB** mewarisi Kop Surat terpusat instansi (`PrintHeader`) yang mengambil data resmi dari tabel `tenants` & `sekolah`:
- `nama_dinas_atas`, `nama_dinas_bawah`, `nama_cabang_dinas`, `name` (Nama Sekolah)
- `alamat`, `telepon`, `website`, `email`
- `logo_daerah_url` (Kiri) & `logo_url` (Kanan)
- Double Line Border (`3px double #000`)

---

## ADR-003: 1-Klik Direct Opening Built-in PDF Viewer

### Context & Problem
Pengguna mengalami kebingungan dan kelelahan visual jika mengklik tombol "Buka PDF" tetapi harus melewati dialog modal React bertumpuk dengan beberapa tombol aksi tambahan.

### Decision
Tombol "Buka PDF" pada daftar tabel/kartu Perangkat Ajar langsung memicu perolehan Blob PDF Stream dan mengeksekusi `window.open(blobUrl, '_blank')` dalam **1-Klik Murni**.

---

## ADR-004: Isolasi Dokumen KOSP Per Tahun Pelajaran & Shared Word Style Engine

### Context & Problem
Dokumen KOSP (Kurikulum Operasional Satuan Pendidikan) harus bersifat resmi dan terarsip per tahun ajaran. Menggunakan skema penyuntingan tanpa konteks tahun ajaran akan menyebabkan naskah KOSP tahun ajaran sebelumnya terhapus / tertimpa saat disunting pada tahun ajaran baru.

### Decision
1. **Model Prisma `KospConfig`**: Data kustomisasi KOSP terikat secara unik pada pasangan `(tenant_id, tahun_pelajaran_id)`.
2. **Re-use Existing Shared Word Engine**: Menggunakan kembali komponen `<WordEditorModal>` (TinyMCE continuous Word-style preview) tanpa membangun editor rich-text baru dari nol.
3. **Dynamic Multi-Major Live Data Ingestion**: Seluruh tabel Struktur Kurikulum gabungan semua jurusan (AKL, RPL, TKJ, dll) disuntikkan secara otomatis dari data live DB dengan mematuhi aturan 2-semester Kepmendikbudristek No. 262/M/2022.

