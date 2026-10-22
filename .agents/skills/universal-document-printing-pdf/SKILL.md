---
name: universal-document-printing-pdf
description: >-
  Standar Industri Pembuatan Dokumen Resmi, Cetak Browser, dan Ekspor PDF True WYSIWYG.
  Gunakan saat merancang, membangun, memperbaiki, atau merefaktor modul cetak, kop surat, modal pratinjau dokumen, dan ekspor PDF institusi sekolah/enterprise.
---

# Universal Document Printing & True WYSIWYG PDF Export

Panduan standar arsitektur dan alur kerja pembuatan dokumen resmi institusi (Berita Acara, RAB, Sertifikat, Kartu Ujian, Laporan Akademik) dengan jaminan kepatuhan cetak browser (`@media print`) dan ekspor PDF presisi tinggi (*True WYSIWYG*).

---

## 🏛️ Arsitektur Tiga Komponen Inti

Seluruh antarmuka dokumen cetak di frontend wajib dibangun menggunakan 3 pilar komponen standar:

```
┌─────────────────────────────────────────────────────────────┐
│  UniversalDocumentModal                                      │
│  (Header Modal, Toggle Logo Daerah/Sekolah, Unduh & Cetak)  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PrintDocumentSheet (A4 Portrait / Landscape)         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  PrintHeader (Kop Resmi Dinas & Sekolah)        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Naskah Konten, Tabel Data, Rekapitulasi        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Tanda Tangan 2-Tier (Kaprog, Sarpras, Kepsek)  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1. `UniversalDocumentModal`
Modal pratinjau interaktif berbasis dialog responsif:
- **Ukuran Standar**: `size="5xl"` untuk rasio lembar A4 optimal.
- **Dukungan Logo**: Properti `allowLogoToggles={true}`, `showLogoDaerah`, dan `showLogoSekolah`.
- **Aksi Cepat**: Tombol **Cetak** (`window.print()`) dan **Unduh Dokumen (PDF)**.

### 2. `PrintDocumentSheet`
Wadah simulasi lembar kertas fisik A4 (`210mm × 297mm` portrait atau `297mm × 210mm` landscape):
- Memiliki properti `pageNumber`, `totalPages`, dan `footerText`.
- Dilengkapi aturan CSS `@media print` sehingga saat dialog cetak browser dipanggil, seluruh background dan toolbar modal disembunyikan otomatis, hanya menyisakan lembar naskah putih bersih.

### 3. `PrintHeader` & `usePrintHeaderData()`
Komponen kop surat dinas dan sekolah terpadu:
- Mengambil identitas sekolah, alamat, kontak, dan logo base64 secara reaktif via hook `usePrintHeaderData()`.
- Menampilkan garis ganda resmi (*double line border* kop surat pemerintah: garis tebal 2px atas, garis tipis 0.8px bawah).

---

## ⚙️ Teknik Ekspor PDF: Dual-Engine Strategy

Untuk mencegah isu *discrepancy* (tampilan layar berbeda dengan hasil unduh PDF), wajib gunakan strategi **Dual-Engine**:

### Engine 1: Primary True WYSIWYG DOM Capture (`html2canvas-pro` + `jsPDF`)
Menghasilkan file PDF yang **100% identik** dengan tampilan di layar monitor:
1. Pasang ref `useRef<HTMLDivElement>(null)` pada container yang membungkus `PrintDocumentSheet`.
2. Bidik elemen dengan selektor `.print-sheet`.
3. Render canvas menggunakan `html2canvas-pro` dengan konfigurasi resolusi tinggi:
   ```typescript
   const canvas = await html2canvas(sheetElement, {
     scale: 2.5, // Menghasilkan ~300 DPI jernih
     useCORS: true,
     allowTaint: true,
     backgroundColor: '#ffffff',
     logging: false,
   });
   ```
4. Tambahkan image data ke dokumen jsPDF A4 (`orientation: 'portrait'`, `unit: 'mm'`, `format: 'a4'`).
5. Unduh otomatis melalui `pdf.save(filename)`.

### Engine 2: Fallback Programmatic Vector Generator (`jsPDF` + `autotable`)
Modul terisolasi di `src/utils/print/modules/pdf<NamaModul>.ts` yang digunakan jika rendering canvas mengalami kendala:
- Format tabel bersih: Warna header abu terang (`fillColor: [241, 245, 249]`), teks hitam pekat bold, border tipis (`lineColor: [0, 0, 0]`, `lineWidth: 0.2`).
- Hindari pemakaian warna gelap solid (*dark blue/slate background*) pada header tabel resmi dokumen dinas.

---

## ✍️ Standar Penandatangan Dokumen (2-Tier Signatures)

Untuk dokumen institusional resmi (seperti RAB, Pengajuan Anggaran, Berita Acara Sarpras/Akademik), format tanda tangan baku adalah **2 Baris (2-Tier)**:

```
                  [Kota], [Tanggal Dokumen]
Diverifikasi oleh,                          Dibuat oleh,
Wakasek Bidang Sarpras                      Ketua Program Keahlian


( Nama Wakasek )                            ( Nama Kaprog )
NIP. ....................                   NIP. ....................

                  Mengetahui / Menyetujui,
                       Kepala Sekolah


                   ( Nama Kepala Sekolah )
                   NIP. ....................
```

### Aturan Tata Letak & Anti-Cutoff:
1. **Baris 1 (Sejajar)**:
   - Sisi Kiri: Tim Verifikator / Pengawas (misal: Wakasek Bidang Sarpras).
   - Sisi Kanan: Titimangsa dokumen (`Kota, DD MMMM YYYY`) + Pejabat Pembuat Dokumen (misal: Ketua Program Keahlian).
2. **Baris 2 (Tengah Bawah)**:
   - Sisi Tengah: Pejabat Pengesah Tertinggi (`Mengetahui / Menyetujui, Kepala Sekolah`).
3. **Anti-Cutoff Guard**:
   - Berikan batas toleransi halaman `currentY > 200 mm` pada kertas A4 (tinggi 297 mm).
   - Jika posisi vertikal melebihi 200 mm sebelum blok tanda tangan digambar, wajib panggil `doc.addPage()` ke halaman berikutnya agar blok tanda tangan Kepala Sekolah tidak terpotong di tepi bawah.
   - Tinggi ruang tanda tangan proporsional: 16–18 mm.

---

## 🔗 Integrasi Struktur Organisasi (Auto-Resolving Signers)

Nama dan NIP pejabat penandatangan tidak boleh di-*hardcode*. Gunakan hook penemu hierarki jabatan:
- **Kaprog / Unit Kejuruan**: Temukan pegawai pada node `unit_id === jurusanId` atau kecocokan nama jurusan di `/academic/struktur-organisasi/tree`.
- **Wakasek Sarpras / Struktural**: Temukan pegawai pada kode posisi `SARPRAS` atau `WAKA_SARPRAS`.
- **Kepala Sekolah**: Temukan pegawai pada kode posisi `KEPALA_SEKOLAH` atau data profil sekolah di `tenantInfo`.
- **Sediakan Drawer Edit Penandatangan**: Izinkan pengguna mengedit nama/NIP sementara jika ada Plt/Pengganti, disertai tombol **"Reset Struktur"** untuk mengembalikan nama resmi dari sistem.

---

## 📋 Checklist Validasi Dokumen Baru
Sebelum fitur cetak dirilis ke produksi:
- [ ] Komponen menggunakan `UniversalDocumentModal` dan `PrintDocumentSheet`.
- [ ] Kop surat menggunakan `PrintHeader` + `usePrintHeaderData()`.
- [ ] Tombol cetak memanggil `window.print()` dan format lembar rapi di print preview browser.
- [ ] Tombol unduh PDF menghasilkan dokumen presisi 1:1 (*True WYSIWYG*).
- [ ] Tata letak tanda tangan memenuhi standar 2-tier dan tidak terpotong batas margin bawah kertas.
- [ ] Lolos verifikasi build TypeScript (`npx tsc --noEmit`).
