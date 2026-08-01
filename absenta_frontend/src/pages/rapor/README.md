# 🎨 Frontend Module Documentation: Modul Penilaian, Leger & Rapor (`/rapor`)

Modul Frontend Rapor menyajikan antarmuka visual kelas-sentrik berbasis React, TypeScript, TailwindCSS, dan React Query untuk mengelola pengisian nilai sumatif/kategori, cetak e-Rapor resmi Kemendikbud, projek P5, transkrip nilai kumulatif, serta operasional wali kelas.

---

## 🚀 Fitur Utama & Komponen UI

### 1. `InputNilaiPage.tsx` (Lembar Input Nilai Kelas)
* **Memoized 2D Grid Component (`ScoreGridTable.tsx`)**:
  - Menggunakan hash-map 2D ($O(1)$) untuk mencegah UI stuttering saat mengedit ribuan sel nilai.
  - Pewarnaan live berbasis batas KKM (🔴 Remedial, ⚪ Tuntas, 🟢 Sangat Baik).
* **Formula Auto-Calculate Kurikulum Merdeka**:
  - $\text{Nilai Akhir Rapor} = \frac{\text{Rata-Rata}(S_1, S_2, S_3) + S_{\text{akhir}}}{2}$.
* **Toolbar Aksi Massal**:
  - **Tombol 1-Klik Salin CP ke Semua Siswa**: Menyalin teks narasi CP ke seluruh baris siswa sekelas.
  - **Paste Modal (Copy-Paste Spreadsheet)**: Fitur tempel sel nilai langsung dari MS Excel / Google Sheets.
  - **Ekspor e-Rapor Kemendikbud**: 1-Klik download berkas `.xlsx` terformat e-Rapor resmi Dinas Pendidikan.
  - **Pengisian Masa Lalu**: Dropdown `Tahun Pelajaran` dan `Semester` di header untuk merevisi rapor terdahulu.

### 2. `CetakRaporPage.tsx` (Operasional Wali Kelas, Leger & Pratinjau PDF)
* **Badge Info Referensi Presensi System (1 Semester)**:
  - Menampilkan akumulasi real-time Sakit, Izin, Alpa harian/KBM siswa selama 1 semester.
  - **Tombol 1-Klik "Tarik Rekap Kehadiran"**: Mengisi angka presensi ke form Rapor otomatis tanpa memaksa timpa (*override*).
* **Modal Transkrip Nilai Kumulatif (`TranskripModal`)**:
  - Menampilkan Rata-Rata Ijazah Kumulatif (GPA), tabel rata-rata kumulatif per mapel (Sem 1 s/d Akhir), serta status SKL & UKK.
* **Pratinjau PDF di Tab Baru**:
  - PDF Rapor Semester, Rapor P5, Surat Keterangan Lulus (SKL), dan Sertifikat UKK dibuka langsung di tab baru browser (`window.open`).

### 3. `P5Page.tsx` (Projek Penguatan Profil Pelajar Pancasila)
* Perekaman checklist kualitatif 4 tingkat (`BB`, `MB`, `BSH`, `SB`) beserta catatan proses Projek P5 per dimensi.

---

## 🛠️ Integrasi Custom Hooks Terpusat

Modul ini memanfaatkan sistem **Centralized Options Hooks** untuk konsistensi data:

```typescript
import { useJenjang } from '../../hooks/useJenjang';
import { useKelasOptions } from '../../hooks/useKelasOptions';
import { useMapelOptions } from '../../hooks/useMapelOptions';
import { useStrukturKurikulumOptions } from '../../hooks/useStrukturKurikulumOptions';
import { useSiswaOptions } from '../../hooks/useSiswaOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
```

---

## 📂 Struktur Berkas Frontend

```text
absenta_frontend/
├── src/
│   ├── api/
│   │   └── rapor.api.ts               # Axios API client endpoints /rapor/*
│   ├── components/
│   │   └── rapor/
│   │       └── input-nilai/
│   │           └── ScoreGridTable.tsx # Grid input nilai $O(1)$ memoized
│   └── pages/
│       └── rapor/
│           ├── CetakRaporPage.tsx     # Operasional Wali Kelas, Leger & Transkrip
│           ├── InputNilaiPage.tsx     # Form input nilai sumatif/kategori
│           └── P5Page.tsx             # Penilaian Projek P5
```
