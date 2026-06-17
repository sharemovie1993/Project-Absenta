# Laporan Audit: Layer Middleware – Absenta Platform (Backend)

Ditujukan untuk: Pak Asep  
Tujuan: memetakan dan mengevaluasi layer middleware backend yang berevolusi dari SaaS Absensi menjadi SaaS Platform multi-service, sebagai dasar refactor berikutnya (tanpa refactor pada audit ini).

Referensi utama:
- Kernel/registry routes & hooks: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts), [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts), [main.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/main.ts)
- Middleware core: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts), [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts), [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts)
- RBAC/capability: [authorize.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/authorize.ts), [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts), [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts), [tenant-capabilities.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/tenant-capabilities.ts)
- DataScope & mode: [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts), [attendanceMode.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/attendanceMode.ts)
- Observability/cache: [cache-invalidation.middleware.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middleware/cache-invalidation.middleware.ts), [realtime/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/realtime/index.ts)

---

## 1) Identifikasi Seluruh Middleware

Catatan istilah:
- “Middleware” di Fastify biasanya berupa hook (`onRequest`, `preHandler`, `onResponse`, `onError`) atau plugin yang memasang hook.
- Di repo ini ada 3 lokasi terkait: `src/middlewares/*` (utama), `src/middleware/*` (khusus), dan `src/plugins/*` (guard modul).

### 1.1 Middleware Infrastruktur/Kernel (global)

Middleware: CORS Guard  
File: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)  
Tujuan: membatasi origin berbasis host/domain environment, dan menegakkan CORS policy.  
Dependency: konfigurasi environment (MAIN_DOMAIN, PUBLIC_DOMAIN_BASE, FRONTEND_URL, dsb).  
Digunakan pada: seluruh request (global plugin).

Middleware: JWT Plugin  
File: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)  
Tujuan: menyediakan `jwtVerify`/`jwt.sign` untuk auth middleware.  
Dependency: JWT_SECRET.

Middleware: Global Rate Limit  
File: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)  
Tujuan: rate limiting global dengan fallback memory jika redis tidak siap.  
Dependency: redisConfig (opsional).

Middleware: Static Files + Uploads  
File: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)  
Tujuan: expose `/uploads/*` dan multipart upload untuk file.  
Dependency: filesystem runtime.

Middleware: Correlation ID & Request Logging (onRequest)  
File: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)  
Tujuan: menambahkan `x-correlation-id`, menyimpan log request ter-redaksi.  
Dependency: appendLog.

Middleware: Global Error Handler  
File: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)  
Tujuan: standardisasi response error, mapping error prisma, schema validation, JWT error.  
Dependency: appendLog.

Middleware: Highest-Level Debug Hooks (opsional)  
File: [main.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/main.ts)  
Tujuan: trace semua request/response/error (berbasis env).  
Dependency: environment flags.

### 1.2 Middleware Security & Tenant (utama)

Middleware: AuthMiddleware  
File: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts)  
Tujuan: verifikasi JWT (bearer token), normalisasi field payload ke `request.user`, anti cross-tenant via tenant mismatch check, whitelist public endpoint.  
Dependency: fastify-jwt plugin, `isSystemSuperAdmin` helper.  
Dipakai pada: secara global melalui `registerMiddlewares`, juga didaftarkan ulang pada beberapa route group/module.

Middleware: TenantMiddleware  
File: [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)  
Tujuan: resolve tenant context (utama dari JWT; domain hanya konteks), enforce tenant status (SUSPENDED/DELETED), enforce tenant-domain mismatch, dan memanggil SubscriptionGuard.  
Dependency: prisma (tenant lookup), `subscriptionGuard`, `isSystemSuperAdmin`.  
Dipakai pada: group `/api` protectedApi (preHandler), juga didaftarkan ulang di beberapa module.

Middleware: SubscriptionGuard  
File: [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts)  
Tujuan: enforce core subscription tenant agar akses non-billing hanya untuk status tertentu (ACTIVE/TRIAL/UPGRADE_PENDING/PENDING_PAYMENT).  
Dependency: prisma (subscription lookup).  
Digunakan pada: dipanggil dari TenantMiddleware.

### 1.3 Middleware Authorization (role/capability/data scope)

Middleware: Authorize (Role Check)  
File: [authorize.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/authorize.ts)  
Tujuan: role-based gate untuk endpoint tertentu.  
Dependency: request.user, `isSystemSuperAdmin` hanya untuk tenantScoped.  
Dipakai pada: banyak endpoint academic/admin/superadmin dan beberapa sistem.

Middleware: RequireCapability (Permission Check)  
File: [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts)  
Tujuan: capability/action-id check untuk endpoint, dengan fast-path (capabilities di request.user) dan slow-path (DB via AuthorizationService).  
Dependency: AuthorizationService, prisma (khusus fallback SISWA), RoleName enums.  
Dipakai pada: hampir seluruh endpoint sensitif (dashboard, academic, attendance, billing, documents, dll).

Middleware: DetermineDataScope  
File: [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts)  
Tujuan: menurunkan `request.dataScope` untuk isolasi tenant dan pembatasan row-level (khusus SISWA vs petugas).  
Dependency: prisma (cek siswa/petugas), `isSystemSuperAdmin`.  
Dipakai pada: endpoint yang butuh filter data (banyak academic/billing/ops).

Middleware: AttendanceMode Gate  
File: [attendanceMode.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/attendanceMode.ts)  
Tujuan: membatasi endpoint absensi berdasarkan mode tenant (SIMPLE vs MULTI_SESI).  
Dependency: prisma (tenant absensi_mode).  
Dipakai pada: rekap/jadwal-template dan endpoint tertentu.

### 1.4 Middleware “Service Capability” (multi-service entitlements)

Middleware/Plugin: CapabilityGuard (ModuleCapability)  
File: [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts)  
Tujuan: enforce akses modul berdasarkan “tenant capabilities” (CORE/ABSENSI/KOPERASI/REPORTING/PPDB/RAPOR/…).  
Dependency: `getTenantCapabilities`, `isSystemSuperAdmin`.  
Dipakai pada: group `/api` protectedApi (register plugin), dan juga pada plugin self-protecting (invoice/payment).

Resolver: TenantCapabilities Resolver  
File: [tenant-capabilities.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/tenant-capabilities.ts)  
Tujuan: menghitung entitlements tenant dari agregasi features_json Plan pada subscription aktif, dengan cache redis.  
Dependency: prisma subscription + plan, redis (opsional).  
Digunakan oleh: CapabilityGuard.

### 1.5 Middleware Observability & Cache

Middleware: Post-Response Cache Invalidation  
File: [cache-invalidation.middleware.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middleware/cache-invalidation.middleware.ts)  
Tujuan: invalidasi cache berbasis routeKey setelah response sukses; opsional emit realtime update tenant metrics/users.  
Dependency: cache service, tenant detail service, socket.io (opsional).  
Dipakai pada: hook `onResponse` di [realtime/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/realtime/index.ts).

### 1.6 Custom Guards (bukan middleware global, tetapi gate penting)

Guard: ParentAuthGuard  
File: [parent-auth.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/parent-app/guards/parent-auth.guard.ts)  
Tujuan: autentikasi Parent App dengan token parent (bukan JWT user).  
Dependency: ParentAuthService.  
Dipakai pada: route `/api/parent-app/*` yang membutuhkan akses data orang tua.

Guard: SesiGuard (Attendance Sesi)  
File: [sesi.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts)  
Tujuan: validasi akses sesi absensi berdasarkan konteks user (ADMIN/SUPERADMIN vs GURU vs SISWA petugas) dan struktur organisasi.  
Dependency: prisma (guru/siswa/struktur).  
Dipakai pada: endpoint sesi-absensi (via preHandler di routes terkait).

---

## 2) Audit Pipeline Middleware (Urutan untuk Endpoint Utama)

Catatan penting: pipeline aktual saat ini tersusun dari gabungan:
- Hook global dari `registerMiddlewares` (onRequest + preHandler authMiddleware + error handler).
- Hook pada group `/api` di `registerRoutes` (protectedApi: preHandler authMiddleware + preHandler tenantMiddleware + capabilityGuard plugin).
- Hook tambahan (duplikasi) pada beberapa module route file (`addHook('preHandler', authMiddleware/tenantMiddleware)`, dll).

### 2.1 Endpoint: /dashboard (dibaca sebagai /api/dashboard/*)

Endpoint: `/api/dashboard/*`  
Pipeline (urut praktis):
1) Global onRequest: correlation-id + request logging (kernel)  
2) Global preHandler: AuthMiddleware (kernel)  
3) /api protectedApi preHandler: AuthMiddleware (duplikasi)  
4) /api protectedApi preHandler: TenantMiddleware (tenant + subscription enforcement)  
5) /api protectedApi: CapabilityGuard (hanya aktif jika route memiliki config.capability)  
6) Module-level (dashboard module): AuthMiddleware (duplikasi)  
7) Module-level (dashboard module): TenantMiddleware (duplikasi)  
8) Route-level: RequireCapability (dashboard.*)  
9) Controller

### 2.2 Endpoint: /academic/* (dibaca sebagai /api/academic/*)

Endpoint: `/api/academic/*`  
Pipeline generik:
1) Global onRequest  
2) Global AuthMiddleware  
3) /api protectedApi AuthMiddleware (duplikasi)  
4) /api protectedApi TenantMiddleware (tenant + subscription)  
5) CapabilityGuard (aktif jika submodule menetapkan config.capability; mayoritas academic tidak menetapkan)  
6) Route-level kombinasi: Authorize + RequireCapability + DetermineDataScope (tergantung endpoint)  
7) Controller/Service

Catatan variasi penting:
- Submodule `struktur-organisasi` memasang AuthMiddleware lagi (duplikasi) dan Authorize sebagai hook global untuk submodule, lalu RequireCapability per route.

### 2.3 Endpoint: /master/* (tidak ditemukan sebagai prefix eksplisit)

Observasi:
- Prefix `/master/*` tidak tampak sebagai group utama di kernel router.
- “Master data” secara implementasi tersebar terutama di `/api/academic/*` dan beberapa `/api/sekolah/*`.

Rekomendasi audit mapping untuk testing:
- Perlakukan `/api/academic/(jurusan|kelas|mapel|guru|siswa|tahun-pelajaran|semester|jenis-kegiatan-master)` sebagai “master”.
- Perlakukan `/api/sekolah/*` sebagai “master/tenant profile”.

### 2.4 Endpoint: /attendance/* (dibaca sebagai /api/attendance/*)

Endpoint: `/api/attendance/*`  
Pipeline generik:
1) Global onRequest  
2) Global AuthMiddleware  
3) /api protectedApi AuthMiddleware (duplikasi)  
4) /api protectedApi TenantMiddleware (tenant + subscription)  
5) CapabilityGuard: mengecek ModuleCapability.ABSENSI (aktif karena attendance plugin set config.capability via onRoute)  
6) Attendance plugin: TenantMiddleware (duplikasi)  
7) Submodule tertentu: AuthMiddleware/tenantMiddleware/AttendanceMode (variasi dan duplikasi, contoh jadwal-template menambahkan AuthMiddleware lagi)  
8) Route-level: RequireCapability + AttendanceMode + DetermineDataScope + Guard Sesi (variasi)  
9) Controller/Service

### 2.5 Endpoint: /cooperative/* (dibaca sebagai /api/cooperative/*)

Endpoint: `/api/cooperative/*`  
Pipeline generik:
1) Global onRequest  
2) Global AuthMiddleware  
3) /api protectedApi AuthMiddleware (duplikasi)  
4) /api protectedApi TenantMiddleware (tenant + subscription)  
5) CapabilityGuard: mengecek ModuleCapability.KOPERASI (aktif karena cooperative plugin set config.capability via onRoute)  
6) Route-level: RequireCapability (per endpoint koperasi)  
7) Controller/Service

### 2.6 Endpoint: /subscription/* dan /billing/* (dibaca sebagai /api/subscriptions/* dan /api/billing/*)

Endpoint: `/api/subscriptions/*`  
Pipeline:
1) Global onRequest  
2) Global AuthMiddleware  
3) /api protectedApi AuthMiddleware (duplikasi)  
4) /api protectedApi TenantMiddleware  
5) Route-level: RequireCapability (umumnya billing.subscriptions.view.active)  
6) Controller

Endpoint: `/api/billing/*`  
Pipeline:
1) Global onRequest  
2) Global AuthMiddleware  
3) /api protectedApi AuthMiddleware (duplikasi)  
4) /api protectedApi TenantMiddleware  
5) Route-level: kombinasi RequireCapability + DetermineDataScope (pada billing-dashboard routes)  
6) Controller

Catatan: beberapa endpoint billing/subscription sengaja melewati “subscription enforcement core” karena `subscriptionGuard` membypass billing-related path; ini bagian dari desain agar tenant yang belum aktif tetap bisa mengakses billing untuk aktivasi/pembayaran.

### 2.7 Endpoint: /admin/* (dibaca sebagai /api/admin/*)

Endpoint: `/api/admin/*`  
Pipeline generik:
1) Global onRequest  
2) Global AuthMiddleware  
3) /api protectedApi AuthMiddleware (duplikasi)  
4) /api protectedApi TenantMiddleware  
5) CapabilityGuard (aktif hanya bila route set config.capability)  
6) Route-level: kombinasi Authorize(SUPERADMIN) atau RequireCapability(superadmin.* / core.*) tergantung modul admin  
7) Controller

---

## 3) Audit Validasi Tenant

### 3.1 Apakah middleware tenant sudah ada?
Ada:
- TenantMiddleware melakukan:
  - penentuan tenant context (utama dari JWT; domain sebagai konteks tambahan)
  - validasi tenant existence
  - validasi tenant status (SUSPENDED/DELETED)
  - validasi tenant-domain mismatch (untuk non-system SUPERADMIN)
  - memanggil SubscriptionGuard

### 3.2 Apakah semua endpoint menggunakan tenant context?
Tidak seragam:
- Group `/api` protectedApi memasang TenantMiddleware sebagai hook preHandler, sehingga seluruh route yang benar-benar berada di dalam protectedApi seharusnya punya tenant context.
- Namun ada modul “self-protecting” yang mendaftar route di root dan memasang middleware sendiri, sebagian tidak selalu memasang TenantMiddleware di setiap prefix.
- Ada juga route yang berada di “protected block” tetapi dibypass oleh daftar public endpoint (berbasis string path) sehingga tenant check tidak berjalan.

### 3.3 Apakah ada endpoint yang bypass tenant check?
Ada beberapa tipe bypass:
- Bypass terencana (public endpoints): auth/login/register/refresh, verify-email, system config GET, plan public, invoice public, payment webhook/public.
- Bypass berbasis config: route `config.skipAuth` digunakan pada parent-app routes (auth JWT tidak jalan), dan tenantMiddleware untuk parent-app memiliki handler khusus yang “return early” sehingga SubscriptionGuard tidak berjalan.
- Bypass karena whitelist path yang terlalu lebar: kategori “payment public” pada AuthMiddleware/tenantMiddleware saat ini mencakup prefix yang sangat luas (dibahas di bagian Endpoint Tanpa Proteksi dan Gap Analysis).

---

## 4) Audit Subscription System (Core vs Multi-Service)

### 4.1 Core subscription (akses aplikasi secara umum)
Implementasi utama:
- SubscriptionGuard dipanggil dari TenantMiddleware, berlaku untuk mayoritas request tenant-scoped.
- SubscriptionGuard mengecualikan seluruh endpoint billing/invoice/payment agar proses aktivasi/pembayaran tetap bisa dilakukan saat subscription tidak aktif.

Karakter implementasi:
- Validasi subscription berada di layer middleware (TenantMiddleware → SubscriptionGuard).
- Status yang dianggap boleh lewat non-billing saat ini mencakup ACTIVE, TRIAL (sebelum end_date), UPGRADE_PENDING, dan PENDING_PAYMENT.

### 4.2 Service subscription / multi-service entitlements
Implementasi utama:
- CapabilityGuard (ModuleCapability) memeriksa entitlements tenant untuk modul seperti ABSENSI/KOPERASI/REPORTING.
- TenantCapabilities Resolver mengagregasi features_json Plan dari semua subscription aktif (multi-subscription) untuk menghasilkan daftar ModuleCapability.

Karakter implementasi:
- Validasi service subscription berada di layer middleware (CapabilityGuard).
- Enforcement dipicu oleh route config `config.capability` yang di-set oleh plugin modul lewat hook `onRoute`.

### 4.3 Endpoint yang validasi subscription-nya bercampur
Tipe temuan:
- Ada endpoint yang tidak menggunakan RequireCapability dan lebih mengandalkan cek di controller/handler (contoh tertentu pada subscription routes dan beberapa endpoint attendance).
- Ada endpoint yang berada di scope billing (sehingga dibypass core subscription) tetapi tidak selalu memiliki requireCapability, sehingga kebutuhan kontrol akses bergantung pada controller.

---

## 5) Audit Role & Permission

### 5.1 Implementasi role check
Terdapat 2 pola:
- Middleware role check: Authorize(requiredRoles) digunakan pada banyak route tertentu.
- Role check langsung di handler/service: beberapa endpoint melakukan pengecekan role di dalam handler (contoh: beberapa endpoint debug/ops).

### 5.2 Implementasi permission/capability check
Terdapat 3 lapis:
- RequireCapability: memeriksa action-id di capabilities user (rolePermissions + strukturPermissions).
- CapabilityGuard: memeriksa modul entitlement tenant (CORE/ABSENSI/KOPERASI/REPORTING).
- DetermineDataScope + guard spesifik: membatasi row-level akses (khusus SISWA/petugas, sesi absensi, dsb).

Catatan inkonsistensi:
- Penggunaan Authorize vs RequireCapability tidak selalu konsisten; beberapa endpoint memakai keduanya, sebagian hanya salah satu, sebagian tidak memakai keduanya karena mengandalkan handler.

---

## 6) Audit Multi-Role / Position Guru

### 6.1 Apakah posisi guru disimpan di database?
Ya, melalui relasi guru ke struktur organisasi (GuruStrukturOrganisasi) dengan flag aktif dan (di beberapa tempat) rentang waktu start/end.

### 6.2 Apakah posisi digunakan untuk kontrol akses?
Ya, melalui:
- AuthorizationService: menggabungkan RolePermissions dan StrukturPermissions untuk menghasilkan effective capabilities user.
- RequireCapability: fallback DB untuk memastikan permission benar-benar ada.
- SesiGuard: mengecek struktur organisasi tertentu untuk memberi akses lebih luas (mis. scope admin/attendance atau kode struktur tertentu).

### 6.3 Apakah posisi diverifikasi melalui middleware?
Sebagian:
- Tidak ada “PositionMiddleware” generik; verifikasi posisi muncul sebagai:
  - effective capabilities (yang kemudian divalidasi oleh RequireCapability), dan/atau
  - guard khusus (SesiGuard) yang mengecek struktur langsung.

---

## 7) Audit Endpoint Tanpa Proteksi (atau proteksi parsial)

Definisi audit:
- “Tanpa proteksi” = tidak memaksa AuthMiddleware atau role/capability; atau terpasang middleware tetapi dibypass oleh whitelist path.
- “Proteksi parsial” = Auth ada, tetapi Tenant/Subscription/Capability guard tidak jalan.

Temuan utama (kategori):
- Endpoint public terencana:
  - `/health`
  - `/api/auth/*` (login/register/refresh/verify-email/tenant-info/check-domain/check-email/dll)
  - `/api/system/config` (GET)
  - `/api/billing/plans/public`
  - `/invoice/public/*` dan alias `/api/invoice/public/*`
  - `/documents/public/*` (download via signed URL)
  - `/webhooks/payment/*` (webhook)
  - `/api/embedding` (dummy embedding)
  - `/api/parent-app/notifications/push/*` dan fcm register (public dalam konteks parent-app)

Temuan kritikal (perlu perhatian khusus saat refactor):
- Prefix `/payment/*` (legacy) memiliki risiko bypass auth/tenant karena klasifikasi public endpoint berbasis prefix yang terlalu luas pada AuthMiddleware dan TenantMiddleware (lihat Gap Analysis).

Temuan proteksi parsial:
- Prefix tertentu yang hanya memasang AuthMiddleware tanpa TenantMiddleware atau tanpa SubscriptionGuard (contoh: beberapa routes testing/diagnostic) berpotensi menghindari enforcement tenant status dan subscription, meskipun token masih membawa tenant_id.

---

## 8) Audit Feature / Service Access (ABSENSI, KOPERASI, PPDB, RAPOR)

Implementasi yang sudah ada:
- ABSENSI: enforced lewat ModuleCapability.ABSENSI pada attendance plugin (via CapabilityGuard).
- KOPERASI: enforced lewat ModuleCapability.KOPERASI pada cooperative plugin (via CapabilityGuard).
- REPORTING: enforced lewat ModuleCapability.REPORTING pada reporting module.

Implementasi yang belum tampak sebagai modul enforcement:
- PPDB dan RAPOR sudah ada di enum ModuleCapability, tetapi tidak tampak ada plugin/module route yang menetapkan config.capability untuk PPDB/RAPOR (gap readiness).

Catatan penting:
- Selain service access (ModuleCapability), akses granular tetap ditentukan oleh RequireCapability (action-id), sehingga dua sistem berjalan bersama.

---

## 9) Diagram Middleware Saat Ini (Pipeline Aktual)

Diagram A – Request ke Endpoint Protected (umum)
Request
→ Global onRequest (correlation-id, logging)
→ Global preHandler AuthMiddleware
→ /api protectedApi preHandler AuthMiddleware (duplikasi)
→ /api protectedApi preHandler TenantMiddleware (tenant + subscription)
→ CapabilityGuard (jika route punya config.capability)
→ Route preHandler (Authorize/RequireCapability/DetermineDataScope/AttendanceMode/Guard khusus)
→ Controller/Service
→ onResponse (cache invalidation + optional socket emit)
→ Response

Diagram B – Parent App (token parent)
Request /api/parent-app/*
→ /api parentApi preHandler TenantMiddleware (jalur khusus parent-app; resolve tenant dari domain/origin; return early)
→ Route config.skipAuth (AuthMiddleware bypass)
→ ParentAuthGuard (token parent)
→ Controller/Service
→ onResponse (cache invalidation hook tetap global)
→ Response

Diagram C – Self-Protecting Modules (root + /api)
Request /invoice/public/* atau /webhooks/payment/*
→ Auth/Tenant biasanya bypass (public)
→ Controller/Service

Request /api/invoice/* atau /api/payments/*
→ Hook module sendiri (AuthMiddleware + TenantMiddleware + CapabilityGuard) dan/atau hook global (berpotensi duplikasi)
→ Route preHandler (RequireCapability)
→ Controller/Service

---

## 10) Gap Analysis (dibanding arsitektur ideal SaaS multi-service)

Arsitektur ideal yang ditarget:
1) Auth (single source of truth, satu tempat)
2) Tenant Resolver + Tenant Status Gate (single)
3) Core Subscription Gate (single)
4) Service Subscription Gate (ModuleCapability) (single)
5) Role Gate (opsional)
6) Permission Gate (action-id) (single)
7) DataScope (opsional, konsisten)

Gap dan inkonsistensi yang ditemukan:
- Duplikasi AuthMiddleware:
  - AuthMiddleware dipasang global via registerMiddlewares, juga dipasang ulang di /api protectedApi, dan dipasang lagi di beberapa module (dashboard, users, billing-dashboard, dll).
- Duplikasi TenantMiddleware:
  - TenantMiddleware dipasang di /api protectedApi dan dipasang ulang di beberapa module (dashboard, users, billing-dashboard, attendance plugin, rekap routes).
- Public endpoint bergantung pada “whitelist string path”:
  - Beberapa route public berada di dalam block protectedApi dan mengandalkan whitelist di AuthMiddleware/TenantMiddleware untuk bypass.
  - Ini menambah kompleksitas audit, karena akses efektif tergantung string matching path, bukan hanya struktur routing.
- Service subscription gate belum lengkap untuk semua layanan:
  - PPDB/RAPOR (dan beberapa enum capability lainnya) belum tampak modul enforcement-nya.
- Peran “position/struktur” guru belum menjadi middleware generik:
  - Saat ini muncul sebagai gabungan capabilities dan guard khusus; belum ada layer formal “PositionContext middleware”.
- Risiko bypass pada area payment legacy:
  - Klasifikasi endpoint payment sebagai public berbasis prefix terlalu luas; berpotensi membuat endpoint sensitif menjadi tanpa auth/tenant/subscription gate.
- Subscription enforcement bercampur:
  - Core subscription gate ada di middleware (bagus), tetapi sebagian endpoint billing/subscription tidak memakai RequireCapability dan mengandalkan controller.
- DataScope logic berjalan terpisah dari TenantMiddleware:
  - Tenant scoping ada di TenantMiddleware, tetapi DataScope juga membuat keputusan tenant scope via header; perlu konsolidasi agar tidak divergen.

---

## 11) Ringkasan Perubahan
- Membuat laporan audit layer middleware backend (dokumen ini).

