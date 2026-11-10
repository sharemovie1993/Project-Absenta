---
name: phase-3-development
description: >-
  Asisten Fase 3: Pengembangan Kode (Clean Architecture, SOLID, TDD, Design Patterns).
  Gunakan saat pengguna melakukan coding, membangun fitur, merefaktor, atau mengimplementasikan modul.
---

# Fase 3: Pengembangan Kode Berstandar Clean Code & TDD

Fase ini fokus pada penulisan kode berkualitas tinggi yang mudah dipelihara (*maintainable*), teruji (*testable*), dan aman dari regresi.

## 🚀 Standar Penulisan Kode Enterprise

### 1. Clean Architecture & Layer Separation
Pisahkan kode menjadi lapisan independen:
- **Domain Layer**: Entity, Value Objects, Domain Events (Bebas dari dependensi luar).
- **Use Case / Application Layer**: Business Logic, Interfaces/Ports.
- **Infrastructure / Adapter Layer**: DB Repository, External API Clients, Cloud SDKs.
- **Presentation Layer**: Controllers, Handlers, DTOs, Resolvers.

### 2. SOLID Principles Enforcer
- **Single Responsibility (SRP)**: 1 Class/Module hanya memiliki 1 alasan untuk berubah.
- **Open/Closed (OCP)**: Terbuka untuk ekstensi, tertutup untuk modifikasi langsung.
- **Liskov Substitution (LSP)**: Subtype dapat menggantikan Supertype tanpa merusak program.
- **Interface Segregation (ISP)**: Interface yang spesifik dan kecil, bukan interface raksasa.
- **Dependency Inversion (DIP)**: Bergantung pada abstraksi (interface), bukan konkritsi.

### 3. Test-Driven Development (TDD) Workflow
- **Red**: Tulis unit test yang gagal terlebih dahulu berdasarkan spesifikasi API.
- **Green**: Tulis kode sekecil mungkin agar pengujian berhasil (*pass*).
- **Refactor**: Bersihkan kode tanpa mengubah perilaku yang sudah teruji.

### 4. Structured Error Handling & Logging
- Gunakan *Custom Application Exception Class* dengan kode error terpusat.
- Logging menggunakan *Structured JSON Logger* (Pino, Winston, Zap) lengkap dengan `trace_id` / `correlation_id`.

### 5. Server State Management & Cache Consistency (Frontend Standard)
- **Pemisahan Client vs Server State**: Data asinkron dari backend dikelola menggunakan Server State Library (TanStack Query / SWR), bukan disimpan manual di local `useState` yang rentan desinkronisasi.
- **Granular Query Key Factory**: Definisikan Query Keys terstruktur dan konsisten (misal: `['cooperative-suppliers', { tenantId, filter }]`).
- **Mutation Lifecycle & Invalidation**: Setiap mutasi data (`POST`, `PUT`, `DELETE` via `useMutation`) **wajib** menginvalidasi query cache terkait (`queryClient.invalidateQueries({ queryKey: [...] })`) pada callback `onSuccess` atau `onSettled`.
- **Zero-Manual-Reload**: Pengguna tidak boleh dipaksa melakukan refresh manual (F5) untuk melihat data terbaru setelah aksi mutasi berhasil.

### 6. Mobile-First Responsive Architecture & Anti-Overlapping (Pilar 30)
- **Deteksi Viewport (`useIsMobile`)**: Gunakan hook `useIsMobile()` (breakpoint 768px/1024px) untuk melakukan *conditional rendering* cerdas:
  - Tampilkan kartu seluler vertikal (`MobileAcademicList` / Card Deck) pada layar HP, dan tabel tabular (`Table`) pada layar desktop.
  - Sediakan Floating Action Button (FAB) di kanan bawah (`fixed bottom-6 right-6`) pada mode HP agar tombol aksi utama mudah dijangkau dengan satu jempol.
- **Anti-Overlapping Container Standard**:
  - Seluruh kontainer flex/grid wajib menyertakan kelas `w-full max-w-full min-w-0` agar elemen di dalamnya tidak saling menabrak (*zero-clipping / no overlapping*).
  - Teks panjang atau judul wajib menggunakan `truncate` atau disembunyikan secara selektif di layar kecil (`hidden sm:inline`).
- **Responsive Breakpoint Enforcer**:
  - Wajib Mobile-First: Selalu awali dengan 1 kolom (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`). Dilarang menggunakan `grid-cols-2+` secara kaku tanpa breakpoint.
- **Touch-Friendly Tab & Navigation**:
  - Tab menu di HP wajib mendukung touch-scroll horizontal: `overflow-x-auto no-scrollbar flex-nowrap` dengan item `whitespace-nowrap`.

### 7. Sinkronisasi Menu Seeding, RBAC Policies & Position Capabilities (Wajib untuk Setiap Fitur Baru)
Setiap kali menambahkan halaman baru, modul baru, atau menu navigasi baru, **WAJIB** menyelesaikan sinkronisasi 4 berkas inti otorisasi & navigasi:
1. **Daftarkan Menu Navigasi di `seed.ts`**:
   - Daftarkan item navigasi pada array `NAV_ITEMS` di `absenta_backend/src/database/seeds/seed.ts`.
   - Cantumkan `path`, `label`, `icon`, dan `required_capability` yang presisi sesuai modulnya.
2. **Perbarui Baseline Hak Akses di `seed_policies.ts`**:
   - Daftarkan kapabilitas pada peran dasar terkait (`ADMIN`, `GURU`, `SISWA`, dsb.) di `absenta_backend/src/database/seeds/seed_policies.ts`.
   - Pastikan domain kapabilitas terdefinisi dengan tepat (`TENANT`, `ORGANIZATIONAL`, `PLATFORM`, atau `SHARED`).
3. **Petakan Kapabilitas ke Posisi/Jabatan di `position-capabilities.ts`**:
   - Petakan kapabilitas ke struktur jabatan fungsional yang relevan di `absenta_backend/src/config/position-capabilities.ts` (misal: `STRUKTUR_CODES.KURIKULUM`, `WALIKELAS`, `BPBK`, `KESISWAAN`, dll.) dengan prinsip *Least Privilege*.
4. **Dokumentasikan Aksi Baru di `docs/action_catalog.md`**:
   - Daftarkan nama aksi kanonikal baru (jika ada capability baru yang belum pernah ada) ke dalam `absenta_backend/docs/action_catalog.md` pada section kategori yang sesuai agar lolos validasi katalog dan masuk ke database permission saat seeding.

### 8. Standar Engine Filter Akademik Terpadu (`AcademicFilterToolbar` & `useAcademicFilter`)
Seluruh halaman atau view yang menampilkan data akademik (Rapor, Presensi, UKK, Kurikulum, Jadwal, Rekapitulasi) **wajib** menggunakan engine filter terpadu:
- **Hook `useAcademicFilter`**:
  - Tangani filter cascading (TP ➔ Semester ➔ Tingkat ➔ Kelas ➔ Mapel/Siswa) dan debounced search secara otomatis.
  - Hubungkan nilai `filter.values` dan `filter.debouncedSearchQuery` langsung ke parameter TanStack Query.
- **Komponen `AcademicFilterToolbar`**:
  - Selalu sematkan `<AcademicFilterToolbar {...filter.toolbarProps} onAdd={...} onExportExcel={...} onExportPdf={...} />`.
  - DILARANG menggunakan `<select>` atau `<SearchableSelect>` terpisah yang tidak terstandarisasi untuk filter tahun pelajaran / kelas.

### 9. Pola Universal Role-Ready View (DRY) Dual-Mode Tab & Modal
Setiap kali membangun fitur atau modul yang akan diakses oleh lebih dari 1 role (misal UKK, Rekap Kehadiran, Nilai, Siswa, Guru):
- **DILARANG** menduplikasi halaman/view untuk masing-masing role (misal membuat file terpisah `KaprogUkkPage`, `WalasUkkPage`).
- **WAJIB** mengekstraknya menjadi `[Modul]View.tsx` dengan kontrak `Universal[Modul]ViewProps` (`isModal`, `hideLayout`, `readOnly`, scope injection).
- Komponen ini dapat dipanggil langsung sebagai Tab (`hideLayout={true}`) maupun Modal Dialog (`isModal={true}`) oleh seluruh Dashboard Role.
- Rujukan detail: [`universal-role-ready-view`](file:///D:/BarayaProject/Project%20Absenta/.agents/skills/universal-role-ready-view/SKILL.md).

### 10. Standar Code-Splitting, Dynamic Import on Action & Anti-Chunk-Leak (Lighthouse 90+ Standard)
Untuk menjaga beban *Initial Load* tetap ramping dan mencegah kebocoran bundel antar-role (*cross-role chunk leakage*):
- **DILARANG Top-Level Static Import untuk Library/Utilitas Berat**:
  - Utilitas pemrosesan dokumen berat seperti `excel-advanced.utils` (`exceljs`/`xlsx`), generator PDF, atau kompresor media **DILARANG KERAS** di-import secara statis di bagian atas komponen atau custom hook (`import { ... } from '@/utils/excel-advanced.utils'`).
  - **WAJIB** menggunakan **On-Demand Dynamic Import (`await import(...)`)** tepat di dalam fungsi *event handler* saat pengguna menekan tombol Export/Import/Download:
    ```typescript
    const handleExportExcel = async () => {
      const { generateAdvancedExcel } = await import('@/utils/excel-advanced.utils');
      await generateAdvancedExcel(payload);
    };
    ```
- **Wajib `React.lazy()` untuk Seluruh Non-Default Tab, Sub-Tab & Heavy Modal**:
  - Di dalam komponen orchestrator (seperti `UnifiedStaffDashboard`, `StaffBerandaTab`, `AdminDashboard`, atau Dashboard Role lainnya), seluruh komponen Tab selain tab default, Sub-Tab (misal `TeacherBukuNilaiSubTab`, `PerangkatAjarPanel`), serta Modal kompleks (`JurnalKbmModal`, `ModulAjarStudioModal`, `PiketPrintSlip`, dll.) **WAJIB** dideklarasikan menggunakan `React.lazy()`.
  - Ingat: penggunaan state `visitedTabs.has('tabId')` atau `{isOpen && <Modal />}` dengan *static import* hanya mencegah pembuatan DOM, tetapi **TIDAK** mencegah browser mengunduh file `.js` chunk-nya saat halaman pertama kali dibuka. Kombinasikan `React.lazy()` + `<Suspense>` + `visitedTabs` / `isOpen` agar jaringan (network) benar-benar **0 KiB** untuk fitur yang belum dibuka.

### 11. Standar Zero-Framer Shell & GPU-Accelerated Micro-Animations (Anti-TBT Standard)
Untuk menjaga nilai Total Blocking Time (TBT) < 200ms pada smartphone dan browser desktop:
- **DILARANG KERAS** mengimpor `framer-motion` atau `AnimatePresence` pada komponen layout inti, navigasi, dan feedback:
  - `Topbar.tsx`
  - `BottomNavigation.tsx`
  - `Loader.tsx`
  - `Alert.tsx`
  - `UniversalMobileSubtabSidebar.tsx`
  - `ConfirmProvider.tsx` / `ConfirmDialog.tsx`
  - `Modal.tsx`
- **WAJIB** menggunakan transisi CSS murni atau Tailwind GPU-accelerated utility classes:
  - Animasi Drawer/Slide-in: `transition-transform duration-300 ease-out transform-gpu translate-x-0` vs `-translate-x-full`.
  - Animasi Fade/Backdrop: `transition-opacity duration-200 ease-out opacity-100` vs `opacity-0`.
  - Animasi Spin/Pulse: `animate-spin`, `animate-pulse`.
- Aturan Emas: Library `framer-motion` hanya diperbolehkan pada halaman terisolasi yang di-load via `lazy()` (misal onboarding interaktif khusus), dan **TIDAK BOLEH** bocor ke dalam entry chunk `index.js`.

### 12. Standar Below-The-Fold Query Deferral & Viewport-Aware Data Fetching
Saat merancang orchestrator dashboard atau halaman berukuran besar:
- **Prioritaskan Above-The-Fold**:
  - Data yang langsung tampil di layar pertama (kartu status, ringkasan jumlah siswa/guru) dieksekusi secara instan.
- **Tunda (Defer) Query Sekunder**:
  - Query visualisasi berat (grafik tren bulanan, log audit aktivitas, tabel detail) **wajib** ditunda penarikannya menggunakan state `isDeferredReady` via `requestIdleCallback` (fallback 400ms microtask):
    ```typescript
    const [isDeferredReady, setIsDeferredReady] = useState(false);
    useEffect(() => {
      if (typeof window === 'undefined') { setIsDeferredReady(true); return; }
      const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 400));
      const h = idle(() => setIsDeferredReady(true));
      return () => { ((window as any).cancelIdleCallback && typeof h === 'number') ? (window as any).cancelIdleCallback(h) : clearTimeout(h); };
    }, []);

    const { data: chartData } = useQuery({
      queryKey: ['my-chart-data'],
      queryFn: () => getChartData(),
      enabled: isTabActive && isDeferredReady,
      staleTime: 60 * 1000,
    });
    ```
- **Viewport-Aware Fetching**:
  - Jika di layar seluler (<768px) antarmuka menampilkan ringkasan kartu ringkas secara default (misal rombel per tingkat) alih-alih diagram SVG Recharts yang berat, jangan lakukan fetch data diagram SVG sebelum pengguna mengklik tab visualisasi grafik.

### 13. Standar Pemisahan Store & UI Component (Store Decoupling)
- **DILARANG** mendefinisikan Zustand store, TypeScript types, atau helper functions di dalam file komponen UI (`.tsx`) jika store tersebut akan digunakan oleh komponen lain.
- **WAJIB** mengekstrak store ke dalam file terpisah berekstensi `.store.ts` atau `[Feature]Store.ts` (misal: `subtabSidebarStore.ts` terpisah dari `UniversalMobileSubtabSidebar.tsx`).
- Alasan Arsitektur: Jika file A mengimpor store dari file B yang berisi komponen UI kompleks, bundler Vite akan terpaksa menarik seluruh dependensi UI file B ke dalam chunk pemanggil, yang memicu kebocoran bundel (*chunk leakage*) dan membengkakkan ukuran `index.js`.





