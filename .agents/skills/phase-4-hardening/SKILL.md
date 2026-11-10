---
name: phase-4-hardening
description: >-
  Asisten Fase 4: Hardening Keamanan, Optimasi Performa, Observability, dan Production Readiness.
  Gunakan saat aplikasi atau fitur sudah selesai dibuat dan ingin disiapkan untuk lingkungan produksi berstandar Core Web Vitals (CWV) & Lighthouse 90+ (Mobile & Desktop).
---

# Fase 4: Hardening Keamanan, Performa Core Web Vitals & Production Readiness

Fase ini bertujuan memastikan aplikasi tangguh (*resilient*), aman dari serangan keamanan, dan memiliki performa kelas dunia (*world-class performance*) dengan skor **Lighthouse 90+ pada Desktop maupun Mobile**. Seluruh teknik optimasi mengadopsi standar rekayasa perangkat lunak industri riil (decoupling, priority scheduling, resource preloading), bukan teknik manipulasi (*gamification/cloaking*).

---

## 🚀 Panduan Eksekusi Hardening Berstandar Industri

### 1. Security Hardening (OWASP Top 10 Protections)
- **Authentication & Authorization**: JWT dengan masa kedaluwarsa singkat + Refresh Tokens, RBAC/ABAC, Session Invalidation pada password change / impersonation.
- **Input Sanitization & Injection Prevention**: Parameterized queries (ORM/Prepared Statements), sanitasi XSS & SQL Injection. Validasi skema input Zod ketat pada setiap controller/route backend dan form frontend.
- **Security Headers & CORS**: Content Security Policy (CSP), HSTS (`Strict-Transport-Security`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, Strict CORS Policy terisolasi per tenant.
- **Data Protection**: Enkripsi data di media penyimpanan (AES-256) dan enkripsi dalam transit (TLS 1.3).
- **Rate Limiting & Anti-DDoS**: Implementasi IP & User-based Rate Limiting (Redis token bucket algorithm) untuk melindungi endpoint sensitif (`/auth/login`, `/auth/refresh`, API sinkronisasi).

---

### 2. Performance, Caching & Data Freshness Optimization
- **Database Query Optimization**: Audit N+1 Problem, pembuatan composite database index yang efisien, evaluasi `EXPLAIN ANALYZE` pada query agregasi dashboard.
- **Dual-Layer Caching Strategy**:
  - *Backend Cache*: Implementasi Cache Layer (Redis/In-Memory TTL) dengan strategi Cache-Aside & timer unref untuk mencegah memory leak.
  - *Frontend Server State Cache*: Konfigurasi `staleTime: 60 * 1000` (atau lebih tinggi untuk referensi statis seperti master TP/Semester `5 * 60 * 1000`) dan `gcTime` pada TanStack Query untuk mencegah refetching jaringan yang tidak perlu.
- **Event-Driven Cache Invalidation**:
  - Sinkronisasi mutasi data real-time via WebSocket / SSE. Ketika backend membroadcast perubahan data (`socket.emit`), client listener otomatis memanggil `queryClient.invalidateQueries` untuk me-refresh state tanpa full page reload.
  - Penanganan *Optimistic Updates* dengan mekanisme *rollback* jika mutasi gagal di sisi server.
- **Connection Pooling**: Tentukan batas `max_connections`, `idle_timeout`, dan `max_lifetime` pada database pool (Prisma/PgPool).

---

### 3. Immutable Asset Caching, Render-Blocking Elimination & Modern JS Build
- **Immutable HTTP Caching Policy (`/assets/*` vs `index.html`)**:
  - Seluruh file statis hasil build bundler yang memiliki *content-hash* (seperti `/assets/*.js`, `/assets/*.css`, `/assets/*.woff2`) **WAJIB** dikonfigurasi dengan header `Cache-Control: public, max-age=31536000, immutable` (TTL 1 tahun) di level Reverse Proxy (`Caddyfile.production` / Nginx) maupun static file server (`public/serve.json` / Express).
  - Sebaliknya, dokumen `index.html` (dan fallback SPA route) **WAJIB** menggunakan `Cache-Control: no-store, no-cache, must-revalidate` agar setiap kali ada deployment/build baru, browser langsung mengambil `index.html` terbaru beserta referensi hash `/assets/` yang baru.
  - Contoh konfigurasi di **Caddyfile**:
    ```caddyfile
    @hashedAssets path /assets/*
    header @hashedAssets Cache-Control "public, max-age=31536000, immutable"
    @htmlFiles path *.html /
    header @htmlFiles Cache-Control "no-store, no-cache, must-revalidate"
    ```
- **Eliminasi Render-Blocking Stylesheets (`index.html`)**:
  - Font eksternal atau CSS bundle besar **DILARANG** dimuat dengan `<link rel="stylesheet">` sinkron yang memblokir *First Contentful Paint (FCP)*.
  - Terapkan skrip optimasi build (`scripts/optimize-dist-html.cjs`) untuk mengubah CSS bundle menjadi *non-blocking preload*:
    ```html
    <link rel="preload" as="style" href="/assets/index-[hash].css" />
    <link rel="stylesheet" href="/assets/index-[hash].css" media="print" onload="this.media='all'" />
    <noscript><link rel="stylesheet" href="/assets/index-[hash].css" /></noscript>
    ```
- **Modern Build Target & Zero Legacy Polyfill (`vite.config.ts`)**:
  - Tetapkan `build.target: 'es2020'` dan `build.modulePreload: { polyfill: false }` pada `vite.config.ts` untuk mengeliminasi overhead *Legacy JavaScript* polyfill pada browser modern.

---

### 4. Core Web Vitals (CWV) & Lighthouse 90+ Engineering (Mobile & Desktop)

Untuk menembus skor **Lighthouse 85–95+** pada profil seluler (*4x CPU Throttling, Slow 4G Network*), aplikasi wajib mengimplementasikan 6 pilar berikut:

#### 4.1. First Contentful Paint (FCP < 1.0s) & Zero White-Flash App Shell
- **Inlined `#app-shell` di `index.html`**:
  - Jangan biarkan elemen `<div id="root"></div>` kosong tanpa isi.
  - Sisipkan inline SVG mark dan teks antarmuka (*App Shell*) langsung di dalam `#root` pada `index.html` dengan CSS minimalis.
  - Saat browser pertama kali menerima dokumen HTML (sebelum file JavaScript reaktif diunduh dan dieksekusi), browser langsung merender brand mark dan skeleton sistem. Ini memangkas FCP dari 4.0 detik menjadi **120ms – 140ms (Skor FCP 1.00 / Perfect)**.

#### 4.2. Total Blocking Time (TBT < 200ms) & Long-Task Elimination
TBT adalah penghalang terbesar skor performa mobile. TBT terjadi ketika JavaScript memonopoli main thread CPU lebih dari 50ms per task. Eliminasi TBT menggunakan strategi berikut:

- **Standard A: Zero-Framer Shell & GPU-Accelerated Micro-Animations**:
  - Komponen inti navigasi dan app shell (`Topbar`, `BottomNavigation`, `Loader`, `Alert`, `UniversalMobileSubtabSidebar`, `ConfirmProvider`, `Modal`) **DILARANG KERAS** mengimpor `framer-motion` atau `AnimatePresence`.
  - Gunakan transisi CSS native yang diakselerasi GPU (`transform-gpu`, `transition-transform`, `translate-x-...`, `animate-spin`, `animate-pulse`).
  - Efek: Mengeliminasi runtime framer-motion (120KB+ gzipped) dan CPU layout calculation overhead dari critical load path.

- **Standard B: Below-the-Fold Query Deferral (`requestIdleCallback` / `isDeferredReady`)**:
  - Saat halaman dashboard pertama kali dibuka, **JANGAN** menembak seluruh query API secara bersamaan.
  - Pisahkan query menjadi dua prioritas:
    1. *Above-the-fold Critical* (Langsung dieksekusi): Ringkasan status, total siswa/guru aktif, filter semester.
    2. *Below-the-fold Secondary* (Didefer ke waktu idle): Grafik kehadiran bulanan, log audit aktivitas, tabel detail.
  - Implementasi di komponen dashboard:
    ```typescript
    const [isDeferredReady, setIsDeferredReady] = useState(false);

    useEffect(() => {
      if (typeof window === 'undefined') {
        setIsDeferredReady(true);
        return;
      }
      const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 400));
      const handle = idle(() => setIsDeferredReady(true));
      return () => {
        if ((window as any).cancelIdleCallback && typeof handle === 'number') {
          (window as any).cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      };
    }, []);

    // Query sekunder hanya aktif setelah rendering awal selesai
    const { data: chartRes } = useQuery({
      queryKey: ['attendance-chart'],
      queryFn: () => getAttendanceChart(),
      enabled: isActiveTab && isDeferredReady,
      staleTime: 60 * 1000,
    });
    ```

- **Standard C: Mobile Viewport-Aware Query & Component Rendering**:
  - Pada tampilan seluler (<768px), prioritaskan visualisasi ringan (misalnya kartu HTML/CSS distribusi rombel) dibandingkan pustaka visualisasi SVG raksasa (Recharts / Chart.js).
  - Jangan memicu fetch data grafik SVG jika tab grafik di ponsel tidak aktif secara default.

- **Standard D: In-Memory JWT Decoding & LocalStorage Caching**:
  - Pada interceptor HTTP (Axios / Fetch), **DILARANG** melakukan `atob(token.split('.')[1])`, `JSON.parse()`, dan pembacaan `localStorage.getItem()` sinkron secara berulang-ulang di setiap request paralel.
  - Simpan payload JWT yang sudah di-parse ke dalam variabel modul in-memory (`cachedJwtPayload`). Parsing base64 hanya dieksekusi 1 kali per token, bukan 15 kali sekaligus saat dashboard memuat data.

- **Standard E: Deduplikasi Query Tenant & Autentikasi**:
  - Jika endpoint `/api/auth/me` sudah menyertakan informasi tenant (`tenant.subdomain`, `tenant.domain`, `tenant.absensi_mode`), **DILARANG** memanggil endpoint `/api/me/tenant` lagi secara redundan.
  - Gunakan data tenant dari user context yang sudah ada untuk menghemat roundtrip HTTP dan re-render React.

- **Standard F: Production Log Stripping (`Boolean(import.meta.env?.PROD)`)**:
  - Gunakan `Boolean(import.meta.env?.PROD)` (bukan `process.env.NODE_ENV` yang undefined pada Vite production) pada logging service (`LogService.ts`).
  - Nonaktifkan deep object sanitization, console logging, dan debug trace di lingkungan produksi agar CPU tidak terbebani serialization JSON besar saat API merespons.

#### 4.3. Cumulative Layout Shift (CLS < 0.05 / Target 0.00 - Perfect)
- **Pre-Allocated Skeleton Bounding Boxes**:
  - Setiap kartu metrik, bento cell, atau grafik yang memuat data asinkron wajib memiliki dimensi tinggi minimum yang pasti (`min-h-[280px]`, `h-20`, dsb.) yang presisi dengan komponen riilnya saat data selesai dimuat.
  - Gunakan skeleton shimmer Shopee-grade (`AdminDashboardSkeleton`, `HubCardSkeleton`) yang mempertahankan struktur layout 100% sehingga angka CLS tetap mendekati **0.00**.

#### 4.4. Largest Contentful Paint (LCP < 2.5s)
- **Smart Critical Modulepreload**:
  - Pastikan skrip pembangun (`optimize-dist-html.cjs`) menyuntikkan `<link rel="modulepreload">` untuk modul entri utama (`vendor-react`, `index.js`, `vendor-query`).
- **Orchestrator Lazy Architecture**:
  - Komponen tab default (seperti `AdminRingkasanTab`) di-import langsung bersama dashboard orchestrator untuk mencegah waterfall ganda.
  - Seluruh sub-halaman lain (Siswa, Guru, Kelas, Mapel, Dapodik) dipecah dengan `React.lazy()` sehingga pengguna hanya mengunduh kode yang benar-benar mereka buka.

---

### 5. Multi-Device Layout Hardening (Pilar 30 Anti-Overlapping Guard)
- **Viewport Boundary Safety (360px - 414px)**:
  - Mencegah kebocoran horizontal scrollbar pada body/window (`overflow-x-hidden` di container luar, `overflow-x-auto` di komponen lebar seperti tabel/grafik).
  - Terapkan padding dan margin seluler ramah layar kecil (`px-3 py-4 sm:px-6 sm:py-6`).
- **Touch Target Accessibility (WCAG 2.5.5)**:
  - Setiap tombol, ikon clickable, checkbox, dan tab navigation memiliki area sentuh minimal 44x44px.
- **Mobile Vertical Space Economy**:
  - Terapkan varian kartu analitik `compact-premium` atau `mobileCompact={true}` untuk menghemat hingga 50% tinggi layar ponsel agar data esensial langsung terlihat (*above-the-fold*).

---

### 6. Kebijakan Anti-Gamifikasi (Genuine Engineering vs Cloaking)
- **Zero-Toleransi Trik Palsu**:
  - **DILARANG KERAS** menggunakan trik manipulasi Lighthouse (seperti menyembunyikan konten dengan `setTimeout(..., 5000)`, mendeteksi User-Agent bot Lighthouse, atau menonaktifkan fitur esensial hanya saat diaudit).
  - Seluruh perbaikan performa harus murni berasal dari:
    1. Arsitektur code-splitting dan tree-shaking yang bersih.
    2. Penghapusan pustaka animasi berat dari core UI layout.
    3. Penjadwalan eksekusi query (priority scheduling: above vs below the fold).
    4. Caching state dan deduplikasi jaringan.
- Performa yang dicapai harus dirasakan langsung oleh pengguna manusia riil di smartphone Android/iOS maupun desktop.

---

### 7. Observability & Monitoring
- **Structured Health Check**: Endpoint `/healthz` dan `/livez` untuk k8s/load balancer probe (DB check, Cache check, Disk check).
- **Metrics Collection**: Prometheus metrics exporter (request latency, error rate, throughput, system memory/CPU).
- **Centralized Tracing**: OpenTelemetry / Jaeger tracing untuk melacak request antar mikroservis.
