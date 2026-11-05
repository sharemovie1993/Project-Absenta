---
name: universal-document-printing-pdf
description: >-
  Standar Industri Pembuatan Dokumen Resmi, Cetak Browser, dan Ekspor PDF True WYSIWYG.
  Gunakan saat merancang, membangun, memperbaiki, atau merefaktor modul cetak, kop surat, modal pratinjau dokumen, dan ekspor PDF institusi sekolah/enterprise.
---

# Universal Document Printing & True WYSIWYG PDF Export

Panduan standar arsitektur dan alur kerja pembuatan dokumen resmi institusi (Berita Acara, RAB, Sertifikat, Kartu Ujian, Laporan Akademik) dengan jaminan kepatuhan cetak browser (`@media print`) dan ekspor PDF presisi tinggi (*True WYSIWYG*).

---

## 🏛️ Arsitektur Empat Pilar Komponen Inti

Seluruh antarmuka dokumen cetak di frontend wajib dibangun menggunakan 4 pilar komponen standar:

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
│  │  │  UniversalDocumentSignatures (Engine TTD SSOT)  │  │  │
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

### 4. `UniversalDocumentSignatures` & `useDocumentSigners()`
Komponen dan hook tanda tangan resmi siap pakai (Plug-and-Play) yang terhubung langsung ke **`OrganizationalAssignment`** sebagai Single Source of Truth (SSOT):
- **Otomatis Me-resolve Pejabat**: Kepala Sekolah, Wali Kelas (berdasarkan `kelasId`), Kaprog (berdasarkan `jurusanId`), Waka Kurikulum, Waka Sarpras, Waka Hubin.
- **Dukungan 5 Pola Tata Letak Standar**:
  1. `single_kepsek`: Kepala Sekolah saja di sisi kanan bawah (Biodata Siswa, SK, SKL).
  2. `dual_walas_kepsek`: Wali Kelas di kiri, Titimangsa + Kepsek di kanan sejajar (Rapor Semester, Rapor P5, Transkrip).
  3. `dual_unit_kepsek`: Kaprog / Waka di kiri, Titimangsa + Kepsek di kanan (Kalender Akademik, KBM, Berita Acara).
  4. `triangle_rapor`: Orang Tua di kiri & Walas di kanan sejajar simetris, Mengetahui Kepala Sekolah di tengah bawah (Pengesahan Rapor Capaian & Rapor PKL).
  5. `tri_party_row`: Mitra DUDI, Penguji/Kaprog, dan Kepsek dalam 3 kolom horizontal (Sertifikat UKK & PKL).
- **Zero Fallback & Zero Leakage**: Mencegah teks cacat seperti `NIP. -`, otomatis menyelaraskan perataan garis dan tanggal titimangsa resmi slot tahun ajaran.

Contoh Penggunaan Langsung:
```tsx
import { UniversalDocumentSignatures } from '@/components/ui/PrintHeader';

// 1. Dokumen Rapor Semester (Wali Kelas + Kepsek)
<UniversalDocumentSignatures
  layout="dual_walas_kepsek"
  tahunPelajaranId={tahunPelajaranId}
  semesterId={semesterId}
  kelasId={selectedStudent.kelas_id}
/>

// 2. Dokumen Biodata Siswa / SK (Kepsek Saja)
<UniversalDocumentSignatures
  layout="single_kepsek"
  tahunPelajaranId={tahunPelajaranId}
/>

// 3. Dokumen Pengesahan Rapor (Orang Tua + Walas + Kepsek Simetris)
<UniversalDocumentSignatures
  layout="triangle_rapor"
  tahunPelajaranId={tahunPelajaranId}
  kelasId={selectedStudent.kelas_id}
  signers={{ parent: { personName: siswa.nama_ayah || '................................' } }}
/>
```

---

## ⚙️ Teknik Ekspor PDF: Dual-Engine Strategy

Untuk mencegah isu *discrepancy* (tampilan layar berbeda dengan hasil unduh PDF) dan **mencegah insiden teks saling bertumpuk (*kerning collapse*)**, wajib gunakan strategi **Dual-Engine** dengan kepatuhan protokol baku berikut:

### 🚨 Protokol Anti-Kerning Collapse & Anti-Teks Bertumpuk (Chromium / html2canvas Anomaly Resolution)

> [!CAUTION]
> **Masalah Paling Sering Terjadi di Produksi**: Teks pada Kop surat dinas, judul dokumen, diagram pohon, dan tabel saling bertumpuk/menimpa (*letters overlapping*) seperti `P E M E R I N T A H` di mana huruf saling menabrak dan memadat tak terbaca.

#### 4 Akar Penyebab Teknis (The 4 Culprits):
1. **CSS `zoom` pada Parent Container (`#print-desk-canvas-area`)**:
   Untuk menampilkan lembar fisik A4 di monitor kecil/laptop secara responsif, komponen preview menggunakan CSS `zoom` (misalnya `zoom: 0.65`–`0.85` pada mode *Pas Layar*).
   Saat `html2canvas` mengukur elemen anak, Chromium menghitung koordinat `getBoundingClientRect()` yang telah diskalakan turun oleh `zoom`, namun `ctx.font` tetap dirender pada ukuran nominal aslinya (misal 14px). Akibatnya, huruf digambar pada ukuran 14px tetapi diposisikan pada interval spasi 9px! Inilah penyebab 99% teks bertumpuk.
2. **Asinkronitas Web Font (`document.fonts.ready`)**:
   Jika ekspor canvas dimulai sebelum font kustom (`Plus Jakarta Sans`, `Inter`, `Cambria`) selesai dirasterisasi, `html2canvas` menggunakan metrik lebar font fallback sementara, lalu saat teks digambar dengan font asli, jarak antar karakter kolaps.
3. **Ketiadaan Paint Tick Settle Delay**:
   Mengubah `style.zoom = '1'` secara imperatif di JavaScript tidak seketika mengubah internal layout tree Chromium. Membutuhkan waktu bagi browser untuk mengeksekusi siklus reflow/repaint (~100–150ms). Jika `html2canvas` langsung dipanggil tanpa delay, ia masih membaca matriks layout lama yang termampatkan.
4. **OpenType Features & Variable Font Tracking**:
   Kelas Tailwind seperti `tracking-tight` atau varian ligatur OpenType memicu pembagian kalkulasi x-glyph yang salah pada Canvas 2D engine.

---

### Protokol Baku 5 Langkah Ekspor PDF True WYSIWYG:

Wajib terapkan pola kode berikut di setiap handler `handleDownloadPdf`:

```typescript
const handleDownloadPdf = async () => {
  // ── LANGKAH 1: Ambil container canvas preview & simpan zoom asli ──
  const deskCanvas = document.getElementById('print-desk-canvas-area');
  const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';

  try {
    setIsExportingPdf(true);
    toast.loading('Menyiapkan dokumen PDF True WYSIWYG...', { id: 'pdf-export-toast' });

    // ── LANGKAH 2: Matikan zoom DOM riil & paksa reflow sinkron ──
    if (deskCanvas) {
      deskCanvas.style.zoom = '1';
      deskCanvas.style.transform = 'none';
      void deskCanvas.offsetHeight; // Wajib: Trigger synchronous browser reflow
    }

    // ── LANGKAH 3: Tunggu rasterisasi font & beri jeda settle repaint tick ──
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // Wajib: Beri jeda 120ms agar browser menstabilkan layout tree pada skala 100%
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Target seluruh lembar cetak
    const sheetElements = document.querySelectorAll<HTMLElement>('.print-sheet');
    if (!sheetElements || sheetElements.length === 0) {
      toast.error('Lembar dokumen tidak ditemukan', { id: 'pdf-export-toast' });
      return;
    }

    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true, // Wajib: Stream compression aktif
    });

    const pdfWidth = isLandscape ? 297 : 210;
    const pdfHeight = isLandscape ? 210 : 297;

    for (let i = 0; i < sheetElements.length; i++) {
      if (i > 0) {
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      }

      const sheetElement = sheetElements[i];

      // ── LANGKAH 4: Render canvas dengan onclone sanitizer ──
      const canvas = await html2canvas(sheetElement, {
        scale: 2.0, // Wajib: Skala 2.0 (setara ~200 DPI Retina). DILARANG > 2.5
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        // DILARANG menyetel windowWidth artifisial yang merusak rasio cetak fisik
        onclone: (clonedDoc) => {
          // A. Netralkan desk canvas pada DOM kloningan
          const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
          if (clonedDesk) {
            clonedDesk.style.zoom = '1';
            clonedDesk.style.transform = 'none';
          }
          // B. Netralkan seluruh sheet kloningan: hilangkan border, shadow, dan paksa letterSpacing normal
          const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
          clonedSheets.forEach((s) => {
            s.style.zoom = '1';
            s.style.transform = 'none';
            s.style.letterSpacing = 'normal';
            s.style.fontVariantLigatures = 'none';
            s.style.border = 'none';
            s.style.boxShadow = 'none';
            s.style.outline = 'none';
          });
        },
      });

      // ── LANGKAH 5: Preservasi Rasio Aspek (Anti-Gepeng & Anti-Bloat) ──
      // Kompresi 98% (dari 25MB turun ke ~400KB per lembar)
      const imgData = canvas.toDataURL('image/jpeg', 0.88);

      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = pdfWidth * canvasRatio;

      // Render proporsional: DILARANG keras memaksa tinggi pdfHeight jika canvas berbeda rasio
      if (imgHeight <= pdfHeight + 1) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        // Konten multi-page slicing otomatis jika melebihi batas lembar
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }
    }

    pdf.save(filename);
    toast.success('Dokumen PDF berhasil diunduh (True WYSIWYG)', { id: 'pdf-export-toast' });

  } catch (err: any) {
    console.error('[PDF Export Error]:', err);
    toast.error(err.message || 'Gagal mengekspor PDF, gunakan menu cetak browser', { id: 'pdf-export-toast' });
  } finally {
    // ── SELALU KEMBALIKAN ZOOM DESK KE POSISI ASLI ──
    if (deskCanvas) {
      deskCanvas.style.zoom = prevZoom;
    }
    setIsExportingPdf(false);
  }
};
```

---

### Aturan Tipografi & Tata Letak Lembar Cetak

1. **Gunakan `letter-spacing: normal` Secara Eksplisit**:
   Pada elemen root `.print-sheet`, berikan atribut `style={{ letterSpacing: 'normal' }}`. Hindari kelas `tracking-tight` atau `tracking-tighter` di dokumen cetak dinas.
2. **Zero-Truncation pada Nama Pejabat**:
   Dilarang keras menggunakan kelas `truncate` atau `overflow-hidden` pada kotak nama pejabat atau staf di diagram bagan! Gunakan:
   ```tsx
   className="text-xs font-bold text-black text-center whitespace-normal break-words leading-tight px-1 line-clamp-2"
   ```
   sehingga nama panjang seperti `Yulianti Demo`, `Himal Demo`, `Asep Demo` selalu ditampilkan utuh tanpa elipsis `...`.
3. **Pembersihan Judul Dokumen (Title Hygiene Guard)**:
   Hindari penggabungan kata yang menimbulkan redundansi seperti `BAGAN STRUKTUR ORGANISASI STRUKTUR ORGANISASI KURIKULUM`. Selalu bersihkan dengan regex:
   ```typescript
   const cleanDivisionName = useMemo(() => {
     return rawTitle.replace(/BAGAN|STRUKTUR ORGANISASI|STRUKTUR|ORGANISASI|DIVISI/gi, '').trim().toUpperCase();
   }, [rawTitle]);
   ```
4. **Pemisahan Lembar Dinas Terstruktur (Multi-Sheet Separation)**:
   Jika suatu dokumen memiliki bagan pohon hierarki DAN tabel matriks tupoksi panjang, **DILARANG** memaksakan keduanya masuk ke dalam 1 lembar A4 Landscape:
   - **Lembar 1**: Kop Surat Resmi + Bagan Visual Pohon + Blok Tanda Tangan 2-Tier SSOT.
   - **Lembar 2**: Kop Surat Resmi + Matriks Rincian Formasi & Tugas Pokok + Blok Tanda Tangan 2-Tier SSOT.
   Ini menjamin dokumen mematuhi standar arsip tata naskah dinas pemerintah.

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
- [ ] **Anti-Bloat & Anti-Distortion Guard**: Ekspor PDF menggunakan `scale: 2`, `image/jpeg` kualitas `0.88`, `compress: true`, serta **wajib** menghitung `canvasRatio` agar aspek rasio visual 1:1 identik dengan layar modal (ukuran file < 1 MB per lembar dan dilarang memaksakan `pdfHeight` yang menyebabkan gambar gepeng/terpadatkan).
- [ ] Blok tanda tangan menggunakan `UniversalDocumentSignatures` (atau hook `useDocumentSigners`) terhubung ke `OrganizationalAssignment` (DILARANG membuat blok tanda tangan ad-hoc baru).
- [ ] Tata letak tanda tangan memenuhi standar 2-tier dan tidak terpotong batas margin bawah kertas.
- [ ] Lolos verifikasi build TypeScript (`npx tsc --noEmit`).
