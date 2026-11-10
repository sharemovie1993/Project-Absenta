---
name: phase-5-audit
description: >-
  Asisten Fase 5: Audit Kode, Review Keamanan, Analisis Performa, dan Inspection Quality Assurance.
  Gunakan saat pengguna meminta review kode, audit kebersihan proyek, atau audit kepatuhan Core Web Vitals & Lighthouse 90+ (Mobile & Desktop).
---

# Fase 5: Audit Kode, Quality Assurance & Core Web Vitals Inspection

Fase ini melakukan pemeriksaan menyeluruh terhadap basis kode untuk menjamin standar kualitas tertinggi, bebas kerentanan, dan memenuhi standar skor **Lighthouse 90+ (Mobile & Desktop)** sebelum deployment.

---

## 🚀 Checklist Audit Berstandar Enterprise

### 1. Security & Dependency Vulnerability Audit
- Analisis kerentanan dependensi (*npm audit*, *govulncheck*, *pip audit*, *trivy*).
- Pemeriksaan kebocoran rahasia (*secret scanning*): memastikan tidak ada API key, token, atau password yang di-hardcode.

---

### 2. Code Smells & Architectural Audit
- **Dead Code Detection**: Mencari variabel, fungsi, atau file yang tidak terpakai.
- **Complexity Metrics**: Memeriksa nilai Cyclomatic Complexity (hindari fungsi bertingkat > 10).
- **Tight Coupling & Circular Dependencies**: Memastikan modul tidak memiliki ketergantungan melingkar.
- **Store & UI Decoupling Audit**: Memastikan Zustand store, tipe data, dan utility tidak di-ekspor dari dalam file komponen UI (contoh: buat `subtabSidebarStore.ts` terpisah dari `UniversalMobileSubtabSidebar.tsx`) agar bundle utama tidak menarik komponen UI secara prematur.

---

### 3. Edge Case & Failure Mode Analysis
- Memeriksa penanganan *Null Pointer / Undefined*, *Boundary Values*, *Async Race Conditions*, dan *Memory Leaks* (termasuk interval timer tanpa `.unref()`).
- Memastikan transaksi database menggunakan ROLLBACK jika terjadi kegagalan parsial (*ACID Compliance*).
- **Cache Staleness & UI Desync Check**:
  - Memverifikasi setiap aksi mutasi formulir/dialog berhasil memicu invalidasi cache (`invalidateQueries`) sehingga data tabel/ringkasan langsung terbarui tanpa refresh manual.
  - Memverifikasi listener WebSocket/SSE dibersihkan (*cleanup* pada `useEffect` unmount) untuk mencegah kebocoran memori (*memory leaks*) dan *duplicate event listeners*.
- **Mobile Viewport & Overlapping Inspection (360px - 414px)**:
  - Memverifikasi tidak ada elemen UI yang saling menabrak/bertumpuk (*overlapping*) di layar ponsel (<640px).
  - Memverifikasi judul halaman tidak terpotong kaku oleh badge status atau tombol aksi.
  - Memeriksa tabel data lebar memiliki fallback kartu seluler (`isMobile ? <MobileAcademicList /> : <Table />`) atau scroll kontainer yang aman.
  - Memastikan dialog modal seluler tidak terpotong tombol submit-nya di layar kecil (`max-h-[90vh] overflow-y-auto`).
- **Academic Filter Engine Inspection**:
  - Memverifikasi seluruh halaman akademik (presensi, rekap, rapor, UKK, kurikulum) menggunakan komponen terpadu `AcademicFilterToolbar` dan hook `useAcademicFilter`.
  - Memastikan tidak ada penggunaan dropdown filter cascading manual yang rawan desinkronisasi data.

---

### 4. Code Coverage & Quality Metrics
- Verifikasi cakupan unit test (minimal 80% coverage pada Domain & Business Logic).
- Verifikasi bahwa test benar-benar menguji logika (*assertion quality*), bukan sekadar eksekusi baris kode.

---

### 5. Lighthouse, Core Web Vitals & Production Performance Inspection Checklist

Audit berikut wajib dijalankan untuk menjamin skor **Lighthouse 85–95+ (Mobile) & 95–100 (Desktop)**:

#### 📋 Check 1: First Contentful Paint (FCP < 1.0s) & App Shell Inlining
- [ ] Dokumen `index.html` memiliki inline `#app-shell` dengan brand mark SVG dan teks loading di dalam `#root` sebelum bundel JS dimuat.
- [ ] Tidak ada stylesheet render-blocking eksternal (Google Fonts dimuat via preload atau font lokal).
- [ ] Bundel CSS hasil build dikonfigurasi dengan *non-blocking preload* (`media="print" onload="this.media='all'"`).

#### 📋 Check 2: Total Blocking Time (TBT < 200ms) & Zero Framer-Motion in Core Shell
- [ ] Lakukan pencarian (`grep`) `from 'framer-motion'` pada komponen layout kritis:
  - `Topbar.tsx`
  - `BottomNavigation.tsx`
  - `Loader.tsx`
  - `Alert.tsx`
  - `UniversalMobileSubtabSidebar.tsx`
  - `ConfirmProvider.tsx` / `ConfirmDialog.tsx`
  - `Modal.tsx`
- [ ] **Wajib**: Seluruh komponen di atas HANYA menggunakan transisi CSS murni atau Tailwind GPU-accelerated classes (`transform-gpu`, `transition-transform`, `translate-x-...`, `animate-spin`, `animate-pulse`). `framer-motion` tidak boleh masuk ke entry chunk (`index.js`).

#### 📋 Check 3: Below-the-Fold Query Deferral
- [ ] Pada dashboard utama (`AdminDashboard`, `UnifiedStaffDashboard`, `KepalaSekolahDashboard`), query visualisasi sekunder (seperti grafik kehadiran bulanan `admin-attendance-chart` dan log aktivitas `admin-recent-logs`) **wajib** menggunakan deferral state (`isDeferredReady` via `requestIdleCallback` / microtask 400ms).
- [ ] Query *above-the-fold* (ringkasan statistik siswa/guru/presensi) dieksekusi terlebih dahulu agar main thread selesai melakukan hidrasi dan render pertama tanpa lag.

#### 📋 Check 4: Axios Interceptor & Synchronous Storage Audit
- [ ] Interceptor Axios tidak melakukan decoding base64 (`atob`) dan `JSON.parse` berulang pada setiap request paralel. Wajib menggunakan in-memory cache untuk token payload.
- [ ] Tidak ada pemanggilan berulang `localStorage.getItem` sinkron di dalam interceptor request/response yang dapat memblokir thread saat request ditembakkan secara bersamaan.

#### 📋 Check 5: Single-Source Context & Network Deduplication
- [ ] Tidak ada pemanggilan ganda ke `/api/me/tenant` jika `/api/auth/me` sudah mengembalikan data tenant pada auth session.
- [ ] Endpoint preferensi notifikasi (`/api/notifications/preferences`) tidak di-fetch secara eager pada initial mount jika belum dibutuhkan.

#### 📋 Check 6: Production Logging Mode Check
- [ ] Verifikasi `LogService.ts` atau sistem logging menggunakan `Boolean(import.meta.env?.PROD)` untuk mendeteksi lingkungan produksi (bukan `process.env.NODE_ENV` yang undefined pada bundel browser Vite).
- [ ] Pastikan seluruh log debug level rendah dan deep object sanitization nonaktif total di produksi.

#### 📋 Check 7: Cumulative Layout Shift (CLS < 0.05 - Target 0.00)
- [ ] Seluruh kontainer kartu metrik, bento grid, dan grafik memiliki `min-height` tetap (`min-h-[280px]`, dsb.) sehingga ruang visual sudah teralokasi sebelum data API tiba.
- [ ] Skeleton loader (`AdminDashboardSkeleton`, `HubCardSkeleton`) memiliki dimensi pixel yang identik dengan komponen riilnya.

#### 📋 Check 8: Cross-Role Chunk Leakage & Dynamic Import Audit
- [ ] Memeriksa rantai import pada komponen orchestrator dashboard agar saat tab default dibuka, browser tidak ikut mengunduh chunk milik tab sekunder atau modal besar.
- [ ] Seluruh Tab non-default, Sub-Tab sekunder, dan Modal besar di-import menggunakan `React.lazy()` + `<Suspense>`.
- [ ] Seluruh utilitas pemrosesan dokumen berat (`xlsx`, `exceljs`, `jspdf`, `excel-advanced.utils`) HANYA di-import secara dinamis di dalam fungsi event handler (`await import(...)`), bukan top-level import.

#### 📋 Check 9: Immutable Cache TTL Verification
- [ ] Seluruh file ber-hash di `/assets/*` memiliki header `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Dokumen `index.html` memiliki header `Cache-Control: no-store, no-cache, must-revalidate`.
- [ ] `vite.config.ts` menetapkan `build.target: 'es2020'` dan `build.modulePreload: { polyfill: false }`.
