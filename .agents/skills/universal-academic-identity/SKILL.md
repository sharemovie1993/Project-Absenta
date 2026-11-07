---
name: universal-academic-identity
description: >-
  Standar Industri Universal Academic Identity Engine (UniversalStudentIdentity, UniversalTeacherIdentity, useAcademicIdentity, academicIdentityNormalizer).
  Gunakan saat merancang, menampilkan, merefaktor, atau mengaudit identitas siswa dan guru di seluruh modul (Master Data, Rapor, Buku Induk, Klapper, DKN, Transkrip, Sertifikat PKL, Presensi, Cetak Dokumen).
---

# Universal Academic Identity Engine Standard

Panduan implementasi dan standarisasi arsitektur **Universal Academic Identity Engine** di ekosistem Absenta. Engine ini menjadi **Single Source of Truth (SSoT)** untuk seluruh representasi identitas siswa dan pendidik (Guru/PTK) baik pada layar web (Dashboard, Modal, Tabel, Grid Bento) maupun dokumen cetak fisik (Buku Induk, Klapper, DKN, Buku Rapor, Transkrip Nilai, Sertifikat PKL, dan Berita Acara).

---

## 🏛️ Filosofi & Masalah yang Diselesaikan

Sebelum standardisasi ini diterapkan, penanganan data siswa dan guru di berbagai modul mengalami masalah umum:
1. **Desinkronisasi Data**: Setiap modul/dokumen mengambil properti secara parsial (`siswa.nama` vs `siswa.nama_lengkap`, `siswa.nis` vs `siswa.nisn`, dsb).
2. **Pelanggaran Tata Naskah Dinas (NIP Non-PNS Bocor)**: Guru honorer/swasta kerap tertulis `NIP. -` atau `NIP. null`.
3. **Anomali Tanggal Lahir (Koma Gantung TTL)**: Jika tanggal belum terisi, string kerap menghasilkan `Purwakarta, -` atau format tanggal bergeser akibat timezone UTC.
4. **Foto Profil Tidak Terstandar**: Dokumen fisik membutuhkan rasio cetak presisi (3x4 cm / 28x36 mm) dengan bingkai pasfoto formal, bukan avatar bulat web.
5. **Inkonsistensi UI/UX**: Tampilan chip, card, dan biodata detail dibuat ulang berkali-kali di setiap halaman.

---

## 🧱 4 Pilar Komponen & Utilitas Inti

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PURE NORMALIZER (SSoT Data Engine)                                       │
│    src/utils/academic/academicIdentityNormalizer.ts                         │
│    - Bebas dependensi DOM/React (Aman untuk jsPDF & Web UI)                 │
│    - normalizeStudentIdentity(raw) ➔ StudentIdentity                        │
│    - normalizeTeacherIdentity(raw) ➔ TeacherIdentity                        │
│    - Helper: formatTanggalIndonesia, formatTtl, formatNip, formatInitials   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. REACT DATA HOOK (Caching & Smart Fetch)                                  │
│    src/hooks/useAcademicIdentity.ts                                         │
│    - useStudentIdentity({ id, initialData, enabled })                       │
│    - useTeacherIdentity({ id, initialData, enabled })                       │
│    - TanStack Query cache 5 menit, auto-fetch jika relasi belum lengkap     │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
┌──────────────────────▼──────────────┐ ┌──────────────▼──────────────────────┐
│ 3. UniversalStudentIdentity         │ │ 4. UniversalTeacherIdentity         │
│    src/components/common/...        │ │    src/components/common/...        │
│    Mode: 'screen' | 'print'         │ │    Mode: 'screen' | 'print'         │
│    Varian: chip | card | detail |   │ │    Varian: chip | card | detail |   │
│            print_kv | print_table   │ │            print_table              │
└─────────────────────────────────────┘ └─────────────────────────────────────┘
```

---

## 🛡️ 5 Aturan Wajib (Golden Rules)

### 1. Zero-Fallback Mandate NIP (Pilar Utama)
Sesuai Pedoman Tata Naskah Dinas Resmi (TND Kemendikbudristek & BKN):
* 18 digit angka NIP ditulis bersambung tanpa spasi (contoh: `NIP. 197111022008011001`).
* **DILARANG KERAS** menampilkan `NIP. -`, `NIP. null`, atau `NIP. undefined` untuk guru non-PNS/PPPK/honorer/swasta.
* Jika tidak memiliki NIP valid, `nipFormatted` wajib mengembalikan string kosong (`""`) sehingga tidak ada teks NIP yang bocor di layar maupun lembar cetak.

### 2. Anti-Bocor Koma Gantung TTL
* Gunakan fungsi `formatTtl(tempat, tanggal)`.
* Jika tempat lahir atau tanggal lahir kosong, jangan biarkan tanda koma menggantung (anti `"Purwakarta, -"` atau `", 12 Mei 2005"`).
* Format tanggal wajib menggunakan nama bulan Indonesia baku tanpa pergeseran akibat zona waktu UTC (`formatTanggalIndonesia`).

### 3. Kepatuhan Rules of Hooks
Saat menggunakan `useStudentIdentity` atau `useTeacherIdentity` di dalam komponen/modal cetak:
* **WAJIB** dipanggil di level teratas komponen **SEBELUM** ada blok `if (!data) return null;` (early return).
* Meletakkan hook setelah early return akan menyebabkan *React crash* (`Rendered fewer hooks than expected`).

### 4. Standar Ukuran Foto Dokumen Cetak (3x4 cm)
* Mode cetak (`mode="print"`) menggunakan ukuran fisik pasfoto standar lembar ijazah/buku induk: **28 mm × 36 mm** (3x4 cm).
* Jika foto belum diunggah, render bingkai pasfoto formal bertitik (*dashed border*) bertuliskan `Pasfoto 3x4` lengkap dengan ikon siluet, **bukan** lingkaran avatar bulat modern.

### 5. Pure Function untuk Generator Dokumen PDF (jsPDF)
* Saat membangun generator PDF berbasis jsPDF/autoTable (`pdfRaporPkl.ts`, `pdfBukuInduk.ts`, `renderBiodata.ts`), **JANGAN** merender komponen React ke DOM.
* Gunakan fungsi murni `normalizeStudentIdentity(data)` dan `normalizeTeacherIdentity(data)` untuk mengekstrak data yang bersih dan siap dicetak secara instan.

---

## 🚀 Pola Implementasi Baku (Code Patterns)

### 1. Menampilkan Siswa di Halaman Web / Modal (Screen Mode)

```tsx
import React from 'react';
import { UniversalStudentIdentity } from '@/components/common/UniversalStudentIdentity';

export const SiswaItemCard: React.FC<{ siswaData: any }> = ({ siswaData }) => {
  return (
    // Varian Card untuk tampilan bento/grid
    <UniversalStudentIdentity
      data={siswaData}
      variant="card"
      mode="screen"
      showPhoto={true}
    />
  );
};

export const SiswaTablePill: React.FC<{ siswaId: string }> = ({ siswaId }) => {
  return (
    // Varian Chip untuk tabel master data
    <UniversalStudentIdentity
      id={siswaId}
      variant="chip"
      mode="screen"
    />
  );
};
```

---

### 2. Menampilkan Guru / Pendidik (Screen Mode)

```tsx
import React from 'react';
import { UniversalTeacherIdentity } from '@/components/common/UniversalTeacherIdentity';

export const GuruCard: React.FC<{ guru: any }> = ({ guru }) => {
  return (
    <UniversalTeacherIdentity
      data={guru}
      variant="card"
      mode="screen"
      subtitle="Guru Produktif Rekayasa Perangkat Lunak"
      showPhoto={true}
    />
  );
};
```

---

### 3. Menampilkan Identitas Siswa di Dokumen Fisik / Cetak (Print Mode)

```tsx
import React from 'react';
import { UniversalStudentIdentity } from '@/components/common/UniversalStudentIdentity';
import { useStudentIdentity } from '@/hooks/useAcademicIdentity';

export const BiodataPrintModal: React.FC<{ siswaId: string; initialSiswa: any }> = ({
  siswaId,
  initialSiswa,
}) => {
  // 1. Hook SSoT dipanggil sebelum early return
  const { identity, isLoading } = useStudentIdentity({
    id: siswaId,
    initialData: initialSiswa,
  });

  if (isLoading) return <div>Memuat data...</div>;

  return (
    <div className="print-sheet bg-white p-8">
      {/* Format Key-Value Formal untuk Lembar Rapor / Sertifikat */}
      <UniversalStudentIdentity
        data={identity}
        variant="print_kv"
        mode="print"
        showPhoto={true}
        photoSizeMm={{ width: 28, height: 36 }} // Ukuran 3x4 cm presisi
        fields={[
          'nama',
          'nis_nisn',
          'ttl',
          'kelas',
          'program_keahlian',
          'orang_tua',
          'alamat',
        ]}
      />
    </div>
  );
};
```

---

### 4. Ekspor PDF Berbasis jsPDF (Pure Data Normalization)

```ts
import jsPDF from 'jspdf';
import {
  normalizeStudentIdentity,
  normalizeTeacherIdentity,
} from '@/utils/academic/academicIdentityNormalizer';

export function generateSertifikatPkl(rawData: any) {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  // Normalisasi identitas siswa & guru pembimbing
  const student = normalizeStudentIdentity(rawData.siswa);
  const teacher = normalizeTeacherIdentity(rawData.pembimbing);

  // Akses field normalisasi yang terjamin aman tanpa anomali
  doc.setFontSize(14);
  doc.text(student.nama, 148, 80, { align: 'center' });
  doc.text(`NIS / NISN: ${student.nis} / ${student.nisn}`, 148, 88, { align: 'center' });
  doc.text(`Kompetensi Keahlian: ${student.konsentrasiKeahlian}`, 148, 96, { align: 'center' });

  // Tanda tangan pembimbing (Zero-fallback NIP: tidak akan mencetak "NIP. -" bila kosong)
  doc.text(teacher.namaLengkapGelar, 200, 160);
  if (teacher.nipFormatted) {
    doc.text(teacher.nipFormatted, 200, 166);
  }

  return doc;
}
```

---

## 📋 Matriks Varian Komponen

| Varian | Mode | Kasus Penggunaan Ideal | Fitur Utama |
|---|---|---|---|
| `chip` | `screen` | Tabel daftar, badge seleksi, filter bar | Avatar mini (inisial/foto), NIS/NIP singkat, rounded-pill |
| `card` | `screen` | Master Data Grid, Dashboard Bento | Foto profil, badge kelas/jabatan, kontak, info ortu, hover action |
| `detail` | `screen` | Modal detail biodata, lembar inspeksi profil | Tab/seksi terorganisir: Pokok, Akademik, Ortu/Keluarga, Alamat |
| `print_kv` | `print` | Biodata Rapor Halaman 1, Sertifikat, Formulir | Key-value rapi bertitik dua sejajar, pasfoto fisik 3x4 cm |
| `print_table` | `print` | Buku Induk, Klapper, DKN, Transkrip | Tabel bergaris border formal dokumen negara, hemat ruang |

---

## 🔍 Checklist Verifikasi Kepatuhan (Audit Ready)

Sebelum mengakhiri pembuatan atau refaktorisasi komponen identitas:
- [ ] **Tidak ada NIP Bocor**: Guru non-PNS/PPPK tidak menampilkan `NIP. -` atau `NIP. null`.
- [ ] **Tidak ada Koma Gantung TTL**: Tempat dan tanggal lahir yang kosong tidak memunculkan `Tempat, -` atau `, Tanggal`.
- [ ] **Hooks di Atas Early Return**: Tidak ada panggilan `useStudentIdentity` atau `useTeacherIdentity` di bawah `if (...) return`.
- [ ] **Pasfoto Mode Cetak**: Menggunakan rasio fisik 3x4 (28x36 mm) dan bingkai bergaris jika foto nihil.
- [ ] **Semua Field Terintegrasi SSoT**: Menggunakan properti dari objek `StudentIdentity` / `TeacherIdentity` yang telah dinormalisasi.
