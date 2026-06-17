# Laporan Mapping: Blueprint Middleware Refactor ↔ Implementasi Saat Ini (Absenta Backend)

Ditujukan untuk: Pak Asep  
Tujuan: melakukan mapping blueprint middleware refactor dengan kondisi implementasi sekarang (tanpa refactor).

Referensi:
- Blueprint: [02 Bllue Print Refactor Middleware.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/Hardengin%20Layer%20Middleware/02%20Bllue%20Print%20Refactor%20Middleware.md)
- Kernel routes/pipeline: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts), [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
- Middleware/guard utama: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts), [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts), [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts), [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts), [authorize.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/authorize.ts), [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts)

---

## 1) Tabel Mapping: Middleware Eksisting → Middleware Target (Blueprint)

| Middleware Saat Ini | Lokasi | Middleware Target (Blueprint) | Status | Catatan Singkat |
|---|---|---|---|---|
| Auth middleware | [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts) | AuthMiddleware | SEBAGIAN SESUAI | Sudah memverifikasi JWT dan membentuk request.user, tetapi juga memuat whitelist public berbasis prefix + integritas tenant token (overlap dengan tenant layer). |
| Tenant middleware | [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts) | TenantResolverMiddleware + TenantStatusMiddleware + CoreSubscriptionMiddleware | PERLU DIPISAH | Menggabungkan resolver tenant (domain/origin/JWT/header), status tenant, dan memanggil subscription guard; juga ada jalur khusus parent-app dan “skip tenant” superadmin. |
| Subscription guard | [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts) | CoreSubscriptionMiddleware | SESUAI | Sudah berfungsi sebagai core subscription gate (dieksekusi dari tenant middleware). |
| Service capability guard | [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts) | ServiceCapabilityMiddleware | SESUAI (POLA) | Enforcement modul berjalan jika route memiliki `config.capability` (ModuleCapability). |
| Tenant capability resolver | [tenant-capabilities.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/tenant-capabilities.ts) | TenantCapabilitiesResolver (Blueprint) | SESUAI | Agregasi entitlements dari plan snapshot/features_json. |
| Permission/capability check | [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts) | PermissionMiddleware | SEBAGIAN SESUAI | Sudah melakukan check action-id, tapi coexist dengan Authorize (role check) dan beberapa handler melakukan cek role langsung. |
| Role check | [authorize.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/authorize.ts) | PermissionMiddleware (unifikasi) / RoleMiddleware (opsional) | PERLU UNIFIKASI | Blueprint menargetkan permission sebagai satu layer; saat ini role check masih berdiri sendiri. |
| DataScope | [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts) | DataScopeMiddleware | SESUAI | Sudah ada, namun pemanggilan tidak konsisten di semua endpoint dan kadang berada sebelum permission gate. |
| Attendance mode gate | [attendanceMode.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/attendanceMode.ts) | (Tidak eksplisit di blueprint; “service-specific gate”) | TAMBAHAN | Ini layer domain-specific; relevan untuk modul ABSENSI. |
| Cache invalidation (onResponse) | [cache-invalidation.middleware.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middleware/cache-invalidation.middleware.ts) | (Tidak ada di blueprint) | TAMBAHAN | Layer observability/cache setelah controller (post-response). |
| Parent auth guard (custom) | [parent-auth.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/parent-app/guards/parent-auth.guard.ts) | (Custom auth; blueprint mengarahkan `config.skipAuth` untuk bypass JWT) | KHUSUS | Pada implementasi, JWT bypass memakai `config.skipAuth` dan autentikasi parent dilakukan oleh guard ini. |
| Attendance sesi guard (custom) | [sesi.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts) | (Custom guard) | KHUSUS | Gate domain-specific untuk akses sesi absensi berbasis role/struktur. |

---

## 2) Identifikasi Middleware Duplikat (Global vs /api group vs Module)

Sumber pemasangan:
- Global hook: registerMiddlewares memasang `authMiddleware` sebagai `preHandler` global: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
- /api protected group: memasang `authMiddleware` dan `tenantMiddleware` sebagai `preHandler` + register `capabilityGuard`: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- Module-level: beberapa modul memasang ulang auth/tenant di route file atau plugin modul.

Middleware yang muncul lebih dari satu kali pada pipeline request (contoh jalur /api/*):
- AuthMiddleware:
  - Global preHandler (bootstrap)
  - /api protectedApi preHandler (router)
  - Module-level (contoh): [dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts), [billing-dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/billing-dashboard.routes.ts), [user.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/user/routes/user.routes.ts), [payment.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/routes/payment.routes.ts), [pdf.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/pdf/routes/pdf.routes.ts), [invoice.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/routes/invoice.routes.ts)
- TenantMiddleware:
  - /api protectedApi preHandler (router)
  - Module-level (contoh): [dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts), [billing-dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/billing-dashboard.routes.ts), [user.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/user/routes/user.routes.ts), modul “self-protecting” (invoice/payment) via plugin masing-masing.
- ServiceCapability (capabilityGuard):
  - /api protectedApi register plugin (router)
  - Modul “self-protecting” juga memasang capabilityGuard lagi pada subFastify internal (contoh): [invoice/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/plugin.ts), [payment/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/index.ts)
- TenantMiddleware di modul ABSENSI:
  - Sudah ada di /api protectedApi, namun attendance plugin masih memasang tenantMiddleware lagi: [attendance/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/plugin.ts)

---

## 3) Identifikasi Middleware dengan Tanggung Jawab Ganda

Temuan utama:
- TenantMiddleware ([tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)):
  - Tenant resolver: domain (host/subdomain), origin (khusus parent-app), header X-Tenant-ID, dan JWT-first authority
  - Tenant status gate: suspend/deleted & tenant existence
  - Core subscription gate: memanggil subscriptionGuard
  - Pengecualian/exception flow: parent-app early return; superadmin “skip tenant”; domain mismatch exception untuk billing order/choose-plan
- AuthMiddleware ([auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts)):
  - Auth JWT + normalisasi payload
  - Public endpoint policy (whitelist static + dynamic prefix)
  - Token tenant integrity check (anti cross-tenant)

---

## 4) Endpoint yang Menggunakan Whitelist Prefix Bypass

Whitelist prefix bypass yang terdeteksi (berbasis string startsWith):
- Payment:
  - `/payment/`
  - `/api/payment/`
  - `/webhooks/payment/`
  - `/api/webhooks/payment/`
  Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)
- Invoice public:
  - `/invoice/public/`
  - `/api/invoice/public/`
  Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)
- Auth & tenant discovery:
  - `/auth/*`, `/api/auth/*`, `/api/v1/auth/*`
  - `/auth/check-email*`, `/api/auth/check-email*`
  - `/auth/check-domain`, `/api/auth/check-domain`
  - `/auth/tenant-info`, `/api/auth/tenant-info`
  - `/auth/dev/tenants`, `/api/auth/dev/tenants`, `/api/v1/auth/dev/tenants`
  Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)
- Notifications webhook:
  - `/notifications/whatsapp/webhook`
  - `/api/notifications/whatsapp/webhook`
  - `/notification/whatsapp/webhook`
  Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)
- Upload static:
  - `/uploads/`
  Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts)

Catatan tambahan whitelist non-prefix (path exact/variasi):
- `/api/system/config` (GET)
- `/api/billing/plans/public`
- `/api/embedding`
- `/roles` dan `/api/v1/roles`
Sumber: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)

---

## 5) Audit Route Config Readiness (config.capability, config.skipAuth)

### 5.1 Metadata yang sudah dipakai
- `config.skipAuth`:
  - Parent app routes: [parent-app.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/parent-app/routes/parent-app.routes.ts)
  - Notification push endpoints: [notification.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/notification/routes/notification.routes.ts)
  - Documents public download: [documents.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/document-center/routes/documents.routes.ts)
- `config.capability` (ModuleCapability) via onRoute hook:
  - ABSENSI: [attendance/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/plugin.ts)
  - KOPERASI: [cooperative/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/cooperative/plugin.ts)
  - REPORTING: [reporting/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/reporting/index.ts)

### 5.2 Metadata yang belum distandarkan (gap menuju blueprint config.service/config.permission)
Terpantau banyak modul masih mengandalkan kombinasi addHook + preHandler manual tanpa metadata standar untuk “service” dan “permission”, misalnya:
- Dashboard: [dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts)
- Academic: [academic.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/routes/academic.routes.ts)
- Billing & subscription: [subscription.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/subscription.routes.ts), [billing-dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/billing-dashboard.routes.ts)
- Menu, sekolah, documents protected, pdf, dll: terdaftar via [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)

---

## 6) Endpoint yang Tidak Memiliki Permission Guard (atau hanya role check di handler)

Kriteria audit: endpoint yang berjalan hanya dengan AuthMiddleware, atau hanya Auth+Tenant, namun tanpa RequireCapability/Authorize sebagai preHandler.

Temuan yang terkonfirmasi:
- PDF:
  - `/api/pdf/invoice/:id` menggunakan AuthMiddleware dan role check langsung di handler (tanpa RequireCapability).  
    Sumber: [pdf.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/pdf/routes/pdf.routes.ts)
- Payment management (sebagian endpoint):
  - `/api/payments/create`
  - `/api/payments/:payment_id/status`
  - `/api/payments/:payment_id/cancel`
  - `/api/payments/:payment_id/retry`
  Keempat endpoint tersebut tidak terlihat memakai RequireCapability pada route-level (sementara beberapa endpoint lain di file yang sama memakai RequireCapability).  
  Sumber: [payment.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/routes/payment.routes.ts)
- Payment test routes:
  - Group test routes di `/api/payments` hanya memasang AuthMiddleware (tanpa TenantMiddleware/capabilityGuard) pada subFastify khusus test.  
    Sumber: [payment/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/index.ts)

Catatan:
- Daftar di atas adalah hasil verifikasi langsung pada file yang terbaca; kemungkinan ada endpoint lain dengan pola serupa (auth+tenant hook tanpa guard) dan perlu pendataan lanjutan per modul saat eksekusi refactor.

---

## 7) Diagram Pipeline Middleware Aktual (setelah mapping)

### 7.1 Pipeline aktual jalur /api protected (umum)
Request
→ Kernel onRequest (correlation-id + logging) [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
→ Global preHandler AuthMiddleware (aktif) [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
→ /api protectedApi preHandler AuthMiddleware (duplikasi) [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
→ /api protectedApi preHandler TenantMiddleware (tenant resolver + status + core subscription) [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
→ ServiceCapability Guard (jika route punya config.capability) [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts)
→ Route preHandler (RequireCapability / Authorize / DetermineDataScope / AttendanceMode / Guard khusus) [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts)
→ Controller/Service
→ onResponse cache invalidation (opsional emit realtime) [cache-invalidation.middleware.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middleware/cache-invalidation.middleware.ts)
→ Response

### 7.2 Pipeline blueprint target (ringkas untuk pembanding)
Request
→ AuthMiddleware
→ TenantResolverMiddleware
→ TenantStatusMiddleware
→ CoreSubscriptionMiddleware
→ ServiceCapabilityMiddleware
→ PermissionMiddleware
→ DataScopeMiddleware
→ Controller

---

## 8) Gap Table (Blueprint Layer vs Implementasi Sekarang)

| Layer Blueprint | Middleware Saat Ini | Status | Catatan |
|---|---|---|---|
| Auth | AuthMiddleware (auth.ts) | OK (fungsi inti) | Masih bercampur dengan whitelist prefix public; perlu konvergensi ke route config “public/skipAuth”. |
| Tenant Resolver | TenantMiddleware (tenant.ts) | PERLU DIPISAH | Resolver domain/origin/JWT/header masih di satu file bersama status + subscription. |
| Tenant Status | TenantMiddleware (tenant.ts) | PERLU DIPISAH | Status tenant check & existence check menyatu dengan resolver. |
| Core Subscription | SubscriptionGuard (dipanggil dari tenant.ts) | OK | Sudah ada, namun flow parent-app bypass. |
| Service Subscription (ModuleCapability) | CapabilityGuard + tenant-capabilities resolver | OK (pola) | Bergantung pada config.capability; belum semua modul punya config.capability (PPDB/RAPOR belum terlihat). |
| Permission | RequireCapability + Authorize + role check di handler | PERLU UNIFIKASI | Blueprint menargetkan permission layer tunggal; saat ini campuran (Authorize/RequireCapability/inline role check). |
| Data Scope | DetermineDataScope | OK (fungsi) | Pemakaian belum konsisten; juga berada di beberapa route sebelum permission gate. |
| Eliminasi duplikasi | Auth/Tenant/Capability dipasang berulang | GAP | Duplikasi ada di global + /api group + module-level + self-protecting modules. |
| Public endpoint standardisasi | whitelist prefix & list path | GAP | Masih mengandalkan string matching (auth.ts + tenant.ts) selain config.skipAuth. |
| Self-protecting modules standardisasi | invoice/payment/notification register sendiri | GAP | Blueprint menargetkan semua modul lewat pipeline platform; saat ini masih ada modul yang memasang middleware sendiri. |

---

## Ringkasan Perubahan
- Membuat laporan mapping blueprint middleware refactor dengan implementasi saat ini (dokumen ini).

