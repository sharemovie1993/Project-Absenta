# 🛡️ PANDUAN PENGEMBANG: SISTEM HARDENING & DEV AUDIT ABSENTA.ID

Panduan ini mendokumentasikan arsitektur alat penjaminan mutu kode (Hardening Tools) pada proyek frontend Absenta.ID. Gunakan dokumen ini sebagai acuan wajib bagi developer (baik manusia maupun AI) saat mendaftarkan pilar/standar hardening baru agar terintegrasi penuh dari ujung ke ujung (end-to-end).

---

## 📊 ARSITEKTUR ALIRAN AUDIT (WORKFLOW)

Sistem Hardening Absenta.ID bekerja melalui tiga lapis pertahanan (defense-in-depth):

`mermaid
graph TD
    A[Kode Sumber TSX Halaman] -->|A. Build-Time Scan| B(scripts/audit-pages.cjs)
    A -->|B. Run-Time Live Request| C(scripts/dev-audit-server.cjs:9999)
    B -->|Generasi Laporan| D[src/config/hardeningAuditReport.json]
    C -->|Response Real-Time JSON| E[Inspector UI: HardeningInspector.tsx]
    D -->|Fallback & Metadata| F[src/config/hardeningRegistry.ts]
    F -->|Render Struktur Pilar| E
`

1. **Build-Time Static Analysis (udit-pages.cjs)**: Berjalan saat build lokal atau CI/CD untuk memindai seluruh halaman di src/pages dan menghasilkan berkas rangkuman JSON hardeningAuditReport.json.
2. **Real-time Dev Audit Server (dev-audit-server.cjs)**: Server Node lokal di port 9999 yang menganalisis kode secara langsung ketika pengembang membuka UI Inspektor di browser. Server ini bertugas menghasilkan instruksi refaktor instan (*Copy-Pasteable Prompt*).
3. **Hardening UI Inspector (HardeningInspector.tsx & hardeningRegistry.ts)**: UI visual yang menampilkan status kepatuhan pilar per modul, dibaca langsung oleh superadmin/developer.

---

## 📂 STRUKTUR BERKAS & LOKASI UTAMA

Berikut adalah berkas-berkas yang menyusun sistem hardening:

| Nama Berkas | Peran / Deskripsi | Lokasi Fisik |
|---|---|---|
| **Static Scan Script** | Memindai berkas secara rekursif & menghasilkan JSON laporan. | [audit-pages.cjs](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/scripts/audit-pages.cjs) |
| **Dev Audit Server** | Menyediakan API localhost:9999/api/audit untuk inspeksi langsung saat runtime. | [dev-audit-server.cjs](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/scripts/dev-audit-server.cjs) |
| **Hardening Registry** | Mengatur pemetaan standar pilar audit ke representasi UI. | [hardeningRegistry.ts](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/config/hardeningRegistry.ts) |
| **Audit Report DB** | Hasil pemindaian statis terkompilasi (format JSON). | [hardeningAuditReport.json](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/config/hardeningAuditReport.json) |
| **Hardening UI** | Komponen antarmuka visual Inspektor Developer. | [HardeningInspector.tsx](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/components/superadmin/infra/HardeningInspector.tsx) |

---

## 🧱 DAFTAR PILAR HARDENING (28 PILAR AKTIF)

Berikut adalah seluruh pilar yang saat ini terdaftar dan dideteksi oleh kedua engine (udit-pages.cjs dan dev-audit-server.cjs):

| No | Nama Pilar | Key JSON Response | Deskripsi Singkat |
|---|---|---|---|
| 1 | Standardisasi Layout Utama | usesLayout | Wajib menggunakan AcademicPageLayout (Manajemen dengan Sidebar) atau OperationalPageLayout (POS Mode TANPA Sidebar & terdaftar di FULL-PAGE ROUTES App.tsx) |
| 2 | Keamanan Data & Defensive Programming | safeMapping | Peta data wajib menggunakan optional chaining (?.map) |
| 3 | Optimasi DOM Churn (Memoization) | usesMemo | Wajib useMemo + useCallback pada halaman yang memuat list |
| 4 | Keamanan Tipe TypeScript (No Any) | 
oAnyType | Dilarang menggunakan : any atau s any |
| 5 | Pencegahan Kebocoran Memori | safeEffect | Wajib return cleanup di useEffect jika ada listener/timer |
| 6 | Konsistensi Pewarnaan Ketat | strictColors | Dilarang warna hardcode (hex/rgb inline, arbitrary Tailwind) |
| 7 | Kepatuhan Sorting Tabel | 	ableSorting | Komponen <Table> wajib memiliki implementasi sorting |
| 8 | Penanganan State Kosong | emptyState | Wajib menangani kondisi data kosong (EmptyState, !data.length) |
| 9 | Indikator Loading / Skeleton Guard | loadingGuard | Wajib ada loading state saat fetch data |
| 10 | Aksesibilitas Form | ormA11y | Elemen form wajib memiliki ria-label atau htmlFor |
| 11 | Optimasi Pemuatan (Lazy Loading) | performanceOptimization | Komponen berat wajib dimuat dengan lazy() + Suspense |
| 12 | Sistem Panduan Pengguna | userGuidance | Layout wajib memiliki properti instruction |
| 13 | Standarisasi Pagination Tabel | 	ablePagination | <Table> wajib memiliki pagination, onPageChange, onLimitChange |
| 14 | Standarisasi Toolbar Aksi Halaman | standardToolbar | Aksi utama wajib di 	oolbarLeft/	oolbarRight pada Table |
| 15 | Sistem Feedback & Dialog Terstandar | standardFeedback | Dilarang  lert()/confirm() browser, wajib useToast/useConfirm |
| 16 | Konsistensi Kontainer UI | standardContainer | Layout wajib dibungkus SectionCard atau Card |
| 17 | Komponen Seleksi Canggih |  dvancedSelect | Elemen <select> wajib diganti <SearchableSelect> |
| 18 | Standarisasi Toolbar Kontekstual Tabel | 	ableToolbar | Aksi operasional tabel wajib di slot 	oolbarLeft/Right |
| 19 | Standarisasi Navigasi Portal & Tombol Kembali Capsule | `breadcrumbNavigation` / `navigationStandard` | Layout wajib menyediakan navigasi portal terpusat dan tombol kembali Glass Capsule |
| 20 | Shared UI Components | usesUiComponents | Wajib mengimpor komponen dari components/ui |
| 21 | Proteksi Fitur Berbayar | premiumFeatureGate | Modul berbayar wajib menggunakan <PremiumFeatureGate> |
| 21B | Pencegahan God File | godFileGuard | Halaman < 800 baris, subkomponen < 500 baris (Terintegrasi AST Import Tracer untuk melacak ukuran seluruh sub-komponen anak secara akumulatif) |
| 22 | Desentralisasi Konfigurasi (Anti-Hardcoded) | hardcodedConfig | Dilarang data mock/dummy lokal atau URL API hardcode |
| 23 | Standarisasi Kartu Analitik/Statistik |  nalyticsCardGuard | Wajib menggunakan <AnalyticsCard> atau MemoizedAnalyticsCard |
| 24 | Standarisasi Impor & Ekspor Data | importExportGuard | Ekspor/impor wajib: loading guard, try-catch, generateImportTemplate |
| 25 | Sistem Ekspor PDF Terstandar | standardPdfPrint | Dilarang pakai jsPDF langsung, wajib via utils/print/ |
| 26 | Validasi Skema Zod untuk Form | zodValidationGuard | Form wajib dilindungi z.object(...) / zodResolver / .safeParse() |
| 27 | Standarisasi Tab Switcher | standardTabSwitcher | Navigasi tab wajib menggunakan komponen <TabSwitcher> |
| 28 | Konsistensi Aliran Tata Letak | layoutFlowConsistency | Filter & stats card wajib tampil di atas tabel data master |
| 29 | Kesiapan Whitelabel & Dynamic Branding | whitelabelBrandingGuard | Dilarang hardcode nama platform statis 'Absenta.id'; wajib variabel dinamis tenantName/systemConfig |
| 30 | Adaptabilitas Responsif Multi-Perangkat | responsiveLayoutAdaptationGuard | Wajib teradaptasi di 3 tingkatan layar (Desktop, Tablet, Mobile), zero-clipping, Touch-Scroll TabSwitcher, & AnalyticsCard Mobile-Mini (52px) |

---

## 🛠️ LANGKAH-LANGKAH PENDAFTARAN PILAR BARU

Setiap kali Anda ingin mendaftarkan pilar hardening baru, Anda **WAJIB** menyelesaikan 5 tahapan berikut tanpa ada yang terlewat:

### 1. Tambahkan Deteksi Statis di udit-pages.cjs
Buka berkas [audit-pages.cjs](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/scripts/audit-pages.cjs):
1. Definisikan logika regex/string matching baru di dalam loop pemindaian file (di bawah blok pilar terakhir).
   * *Contoh*: const missingMyPillar = ...
2. Tambahkan pelaporan isu jika aturan dilanggar:
   `javascript
   if (missingMyPillar) {
     if (status === 'COMPLIANT') status = 'PARTIAL'; // atau NON_COMPLIANT
     issues.push(❌ Pesan kesalahan detail untuk developer...);
   }
   `
3. Petakan hasil boolean tersebut ke dalam objek JSON output jsonResults[key]:
   `javascript
   myPillarGuard: !missingMyPillar,
   `

### 2. Tambahkan Deteksi Real-Time di dev-audit-server.cjs

> ⚠️ **WAJIB mendefinisikan SELURUH variabel deteksi** di sini, termasuk variabel bantu (semua hasXxx, usesXxx). Jangan hanya menyalin kondisi missingXxx tanpa mendefinisikan semua variabel yang dirujuknya — ini adalah sumber bug ReferenceError yang paling umum terjadi pasca-refaktor.

Buka berkas [dev-audit-server.cjs](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/scripts/dev-audit-server.cjs):
1. Salin **seluruh blok definisi variabel** dari udit-pages.cjs (termasuk variabel perantara seperti hasXxx):
   `javascript
   // ─── Pilar N: Nama Pilar Baru ───
   const hasMyThing = /pattern/.test(content);
   const usesMyComponent = content.includes('MyComponent');
   const missingMyPillar = hasMyThing && !usesMyComponent && !isComponentFile;
   `
2. Push pesan kesalahan ke dalam array issues jika dilanggar:
   `javascript
   if (missingMyPillar) {
     issues.push(❌ Pesan kesalahan detail untuk developer...);
   }
   `
3. Daftarkan field boolean tersebut pada objek JSON response di bagian bawah (es.end(JSON.stringify({...}))):
   `javascript
   myPillarGuard: !missingMyPillar,
   `

### 3. Daftarkan Metadata Standar di hardeningRegistry.ts
Buka berkas [hardeningRegistry.ts](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/config/hardeningRegistry.ts):
Daftarkan objek evaluasi baru ke dalam fungsi getHardeningConfig:
`	ypescript
    if (auditData.myPillarGuard !== undefined && auditData.myPillarGuard !== null) {
      config.standards.push({
        id: 'architectural_my_pillar',
        name: 'Nama Pilar Keren (MyPillar Guard)',
        description: 'Penjelasan mengapa standar ini penting secara arsitektural...',
        status: auditData.myPillarGuard ? 'VERIFIED' : 'FAILED', // atau WARNING
        details: auditData.myPillarGuard
          ? 'Tervalidasi: Kode mematuhi standar ini dengan baik.'
          : 'Gagal: Keterangan instruksi perbaikan instan.'
      });
    }
`

### 4. Regenerasi Database Laporan (hardeningAuditReport.json)
Jalankan perintah berikut pada terminal di folder bsenta_frontend:
`ash
node ./scripts/audit-pages.cjs
`
Perintah ini akan memperbarui hardeningAuditReport.json dengan kriteria baru untuk seluruh halaman utama di aplikasi.

### 5. Jalankan Validasi Kompilasi Akhir
Pastikan tipe data dan impor tidak merusak proses build produksi:
`ash
npm run build
`
Proses kompilasi harus selesai dengan **sukses 100% tanpa error**.

---

## 💡 PERTANYAAN UMUM (FAQ)

* **Bagaimana cara menguji audit baru secara lokal?**
  Jalankan server dev audit dengan 
pm run audit. Jalankan aplikasi dengan 
pm run dev. Buka menu Inspektor Hardening pada panel superadmin, lalu klik Jalankan Inspeksi.

* **Apa perbedaan udit-pages.cjs dan dev-audit-server.cjs?**
  * udit-pages.cjs adalah **pemindai statis** (batch): berjalan sekali, memindai semua file sekaligus, dan menghasilkan hardeningAuditReport.json.
  * dev-audit-server.cjs adalah **server real-time**: berjalan terus di background (port 9999), membaca satu file per request saat Inspector UI diklik.
  * **Logika deteksi kedua file harus selalu sinkron.** Variabel yang didefinisikan di salah satu wajib juga ada di yang lain.

* **Kapan status harus FAILED dan kapan WARNING?**
  * FAILED (Merah): Untuk pelanggaran kritis yang dapat menyebabkan crash visual total, kegagalan fungsional berat, atau celah keamanan.
  * WARNING (Kuning): Untuk masalah performa minor, optimasi rendering (seperti useMemo), atau redundansi styling visual.

* **Mengapa saya mendapat ReferenceError: hasXxx is not defined saat dev server jalan?**
  Ini terjadi karena variabel deteksi baru ditambahkan di  udit-pages.cjs tetapi **tidak disalin sepenuhnya** ke dev-audit-server.cjs. Pastikan seluruh blok variabel (bukan hanya kondisi missingXxx) ikut disalin. Lihat Langkah 2 di atas.

* **Bagaimana mesin audit mendeteksi ukuran modul halaman secara akurat?**
  Mesin audit menggunakan **AST Import Tracer** yang secara rekursif melacak dan menjumlahkan baris kode dari seluruh sub-komponen anak yang diimpor secara relatif oleh halaman utama. Jika ukuran total modul melebihi batas, laporan audit (baik di konsol maupun di inspektor) akan menampilkan rincian kontributor berkas beserta tautan langsung (`file:///`) ke setiap berkas tersebut untuk memudahkan navigasi langsung dari laporan.
