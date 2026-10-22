---
name: academic-filter-toolbar
description: >-
  Standar Industri Engine Filter Akademik Terpadu (AcademicFilterToolbar & useAcademicFilter).
  Gunakan saat membuat, merefaktor, atau mengaudit komponen filter di seluruh modul akademik (UKK, Rapor, Presensi, Kurikulum, Jadwal, Rekapitulasi).
---

# AcademicFilterToolbar & useAcademicFilter Standard Engine

Panduan implementasi dan standarisasi engine filter akademik terpadu (*Unified Academic Filter Engine*) di ekosistem Absenta. Modul ini menggantikan filter dropdown manual terpisah yang rawan desinkronisasi data, duplikasi hook, dan inkonsistensi UI/UX.

---

## 🏛️ Arsitektur Filter Terpadu

Engine filter akademik terdiri dari dua pilar utama:
1. **Hook Logika & State (`useAcademicFilter`)**:
   - Menangani *cascading state* (Tahun Pelajaran ➔ Semester ➔ Tingkat ➔ Kelas ➔ Mapel / Guru / Siswa / Mitra).
   - Mengambil opsi dropdown secara otomatis via TanStack Query terstandar (`useTahunPelajaranOptions`, `useSemesterOptions`, `useKelasOptions`, dll.).
   - Menyediakan fitur *Debounced Search* bawaan (`debouncedSearchQuery`).
   - Menyediakan fitur *Cohort Lineage* (pelacakan riwayat rombel siswa dari tingkat 10 s.d. 12/13).
   - Mengemas seluruh props UI ke dalam satu objek `toolbarProps`.

2. **Komponen Presentasi (`AcademicFilterToolbar`)**:
   - Komponen UI terpadu yang memadukan dropdown `SearchableSelect`, kolom pencarian debounced, tombol reset, indikator loading skeleton, serta slot tombol aksi (`onAdd`, `onImport`, `onExportExcel`, `onExportPdf`, `actionsLeft`, `actionsRight`).
   - Mendukung dua varian tampilan: `variant="card"` (default box berbingkai rapi) dan `variant="inline"`.
   - Mengimplementasikan standar aksesibilitas WCAG dan adaptabilitas responsif seluler (*Pilar 30 Anti-Overlapping*).

---

## 🚀 Pola Implementasi Baku (Code Pattern)

### 1. Inisialisasi Hook di Halaman / View
```tsx
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';

export const ModulAkademikView: React.FC = () => {
  // 1. Inisialisasi Hook dengan Feature Flags yang dibutuhkan
  const filter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableTingkat: true,
    enableKelas: true,
    enableSearch: true,
    searchDebounceMs: 400,
    allowAllKelas: true, // Izinkan opsi "Semua Kelas" jika relevan
    onFilterChange: (values) => {
      // Callback opsional saat filter berubah
    },
  });

  // 2. Hubungkan state filter ke TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: ['modul-data', {
      tpId: filter.values.tahunPelajaranId,
      semesterId: filter.values.semesterId,
      tingkat: filter.values.tingkat,
      kelasId: filter.values.kelasId,
      search: filter.debouncedSearchQuery,
    }],
    queryFn: () => fetchModulData({ ... }),
  });

  return (
    <div className="space-y-4">
      {/* 3. Pasang Toolbar dengan Spreading toolbarProps */}
      <AcademicFilterToolbar
        {...filter.toolbarProps}
        onAdd={() => setIsAddModalOpen(true)}
        addLabel="Tambah Data"
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
      />

      {/* 4. Tabel / Konten Data */}
      <Table ... />
    </div>
  );
};
```

---

## ⚙️ Fitur-Fitur & Flags Pendukung

### 1. Feature Flags Dropdown
Aktifkan hanya filter yang relevan dengan modul:
- `enableTp`: Filter Tahun Pelajaran aktif.
- `enableSemester`: Filter Semester (Ganjil/Genap) yang otomatis tersinkronisasi dengan TP.
- `enableTingkat`: Filter Tingkat/Jenjang (Kelas X, XI, XII, XIII dengan angka Romawi otomatis).
- `enableKelas`: Filter Rombongan Belajar / Kelas (otomatis terfilter berdasarkan Tingkat dan TP terpilih).
- `enableMapel`: Filter Mata Pelajaran.
- `enableGuru`: Filter Guru Pengajar / Pembimbing.
- `enableSiswa`: Filter Siswa per kelas terpilih.
- `enableMitra`: Filter Mitra Dunia Usaha / Dunia Industri (DU/DI).
- `enableSearch`: Kolom input pencarian cepat.
- `enableGender`: Filter Jenis Kelamin (Laki-laki / Perempuan).
- `enableStatusSiswa`: Filter status siswa (Aktif, Mutasi, Lulus, dsb.).
- `enableCohort`: Navigasi linimasa cohort siswa antar-tingkat.

### 2. Aksi Cepat & Kustomisasi Slot
- `onAdd` & `addLabel`: Tombol primer tambah data baru.
- `onImport` & `importLabel`: Tombol impor massal Excel/CSV.
- `onExportExcel`: Tombol ekspor format Excel spreadsheet.
- `onExportPdf`: Tombol cetak / ekspor naskah dokumen PDF.
- `actionsLeft` / `actionsRight`: Slot React Node untuk tombol khusus (misal: tombol Sync, Approval, Toggle Tab).
- `bottomContent`: Slot konten di bawah deretan filter (misal: status badge, KPI ringkas, alert info).

---

## 🚫 Larangan & Anti-Pattern (Audit Violations)

1. **DILARANG** membuat dropdown manual Tahun Pelajaran, Semester, atau Kelas secara terpisah menggunakan `<select>` atau `<SearchableSelect>` lepas di halaman akademik. Seluruh modul wajib menggunakan `AcademicFilterToolbar`.
2. **DILARANG** melakukan query cascading manual (misal: `useQuery` TP manual, lalu `useEffect` untuk mengubah kelas manual). Serahkan seluruh logika cascading kepada `useAcademicFilter`.
3. **DILARANG** mengabaikan debouncing pada input pencarian (dapat menyebabkan *API flooding* dan *race condition*). Gunakan `filter.debouncedSearchQuery` sebagai dependency data fetching.
4. **DILARANG** mengabaikan adaptasi seluler. `AcademicFilterToolbar` sudah dioptimasi untuk layar sentuh ponsel (<640px) dan zero horizontal clipping.
