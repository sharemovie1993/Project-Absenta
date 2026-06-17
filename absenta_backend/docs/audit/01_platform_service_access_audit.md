## Audit – Platform Service Access (Service Access Layer)

Tanggal: 2026-03-15

### 1) Tenant Provisioning Model
- Alur registrasi tenant membuat tenant baru + admin user, lalu membuat subscription default ke plan `CORE_PLATFORM`.
- Plan `CORE_PLATFORM` adalah plan default yang disiapkan oleh seeding database.
- Fitur layanan tenant tidak disimpan langsung di tabel Tenant; entitlements dihitung dari subscription/plan.
- `absensi_mode` tenant diselaraskan saat pembuatan subscription (mengikuti `absensi_mode` plan).

### 2) Plan Feature Model
- Sumber kebenaran fitur layanan ada di `Plan.features_json` (format array).
- `Plan.features_json` pada plan default berisi `CORE`.
- Plan layanan tambahan menggunakan kombinasi `CORE` + capability lain (contoh: `ABSENSI`, `KOPERASI`, `REPORTING`).
- Subscription menyimpan `plan_snapshot`, namun entitlements layanan saat runtime saat ini dihitung dari relasi `Subscription -> Plan` (bukan dari `plan_snapshot`).

### 3) Service Modules Mapping (Backend)
- ABSENSI: module attendance (CAPABILITY GUARDED).
- KOPERASI: module cooperative (CAPABILITY GUARDED).
- REPORTING: module reporting (CAPABILITY GUARDED).
- KESISWAAN: module kesiswaan (SERVICE ACCESS NOT GUARDED).
- KURIKULUM: module kurikulum (SERVICE ACCESS NOT GUARDED).
- DOCUMENT CENTER: module document-center (SERVICE ACCESS NOT GUARDED).
- Academic/Core modules (academic, billing, dashboard, user/tenant, menu, system-config, sekolah, upload, pdf, notification) saat ini tidak diproteksi oleh service capability (diasumsikan bagian dari CORE atau bersifat platform/core).

### 4) Feature Enforcement Layer (Backend)
- Ada enforcement layer untuk service access berbasis `capability` pada pipeline `/api` protected routes.
- Enforcement aktif hanya jika suatu route/module menetapkan `routeOptions.config.capability`.
- Perhitungan capability tenant dilakukan dengan agregasi `features_json` dari semua subscription yang dianggap aktif.
- Core subscription enforcement ada pada `subscriptionGuard`, tetapi saat ini tidak konsisten memblokir semua status non-aktif (risiko akses core ketika subscription tidak valid).

### 5) Menu Gating vs Backend Enforcement
- Menu seed menyimpan `required_features` dan `required_capability` pada tabel Menu.
- Backend API menu saat ini memfilter menu terutama berbasis `required_capability` (permission/action id) dan role visibility; `required_features` belum digunakan sebagai filter pada response menu.
- Untuk module yang sudah CAPABILITY GUARDED (ABSENSI/KOPERASI/REPORTING), backend tetap memblokir akses endpoint jika tenant tidak memiliki capability walaupun UI menampilkan menu.
- Untuk module yang SERVICE ACCESS NOT GUARDED (mis. kesiswaan/kurikulum/document-center), gating `required_features` berpotensi menjadi UI ONLY ACCESS CONTROL.

### 6) Endpoint Exposure Analysis
- Endpoint attendance/cooperative/reporting: terlindungi oleh capability guard pada level module (via hook `onRoute`).
- Endpoint kesiswaan/kurikulum/document-center: tidak ada proteksi capability module; proteksi bergantung pada RBAC permission per route.
- Endpoint publik yang sengaja skip auth:
  - Invoice public (token-based)
  - Payment public/webhook (integrasi pembayaran)
  - Document Center public download (token-based)

### 7) Risiko Akses Layanan Tanpa Subscription
- Risiko UI-only gating: beberapa service yang ditandai `required_features` di menu tidak memiliki enforcement service capability di backend.
- Risiko core-access saat subscription non-aktif: guard subscription saat ini tidak memastikan semua status non-aktif diblok untuk endpoint non-billing.
- Risiko drift entitlements: runtime capability dihitung dari `Plan.features_json` (mutable), bukan `Subscription.plan_snapshot` (immutable snapshot).

