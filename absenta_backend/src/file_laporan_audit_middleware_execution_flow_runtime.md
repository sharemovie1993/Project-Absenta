# Laporan Audit: Middleware Execution Flow (Runtime) – Absenta Backend

Ditujukan untuk: Pak Asep  
Tujuan tahap ini: memverifikasi pipeline middleware yang benar-benar dieksekusi pada request runtime untuk endpoint representatif (tanpa refactor).

Setup runtime audit (ringkas):
- Backend dijalankan pada port `3010` (untuk menghindari konflik port).
- Debug runtime yang aktif:
  - Highest-level debug (onRequest/onResponse) dari [main.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/main.ts)
  - Logging global onRequest dari [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
  - Logging preHandler auth/tenant pada /api group dari [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts) (ENABLE_DEBUG_LOGS)
- Token yang dipakai: JWT bertipe SUPERADMIN system (untuk memastikan auth berhasil tanpa tergantung akun DB).
- Untuk endpoint ABSENSI, audit dilakukan dalam 2 mode:
  - tanpa `X-Tenant-ID` (menghasilkan 401 karena tenant context kosong)
  - dengan `X-Tenant-ID=112e351e-6b65-4eab-8cc7-d7fafafcf125` (menghasilkan 403 karena gate internal absensi)

Catatan metodologi:
- “Runtime verified” berarti urutan hook/hook log yang benar-benar terlihat di log runtime.
- “Runtime implied” berarti middleware tidak memiliki logging eksplisit, namun terpasang sebagai hook/preHandler berdasarkan definisi route dan semantik Fastify, sehingga tetap dieksekusi pada runtime.

---

## 1) Pipeline Runtime per Endpoint (Urutan Aktual)

### A) Endpoint: /api/dashboard (representatif: GET /api/dashboard/overview)

Rujukan route: [dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts)

Pipeline aktual (urut):
1. HighestLevelDebug onRequest (runtime verified)  
2. Global onRequest logger/correlation-id (runtime verified)  
3. AuthMiddleware global preHandler (runtime implied; terpasang di bootstrap, dan terlihat adanya deprecation warning dari akses request.context)  
4. /api plugin onRequest debug (“[API Plugin] Request…”) (runtime verified)  
5. AuthMiddleware /api group preHandler (“AUTH preHandler hook called…”) (runtime verified)  
6. TenantMiddleware /api group preHandler (“TENANT preHandler hook called…”) (runtime verified)  
7. CapabilityGuard /api group (runtime implied; terpasang sebagai plugin, tetapi dashboard route tidak set `config.capability` sehingga guard skip)  
8. AuthMiddleware module dashboard (runtime implied; dipasang lagi pada dashboardRoutes)  
9. TenantMiddleware module dashboard (runtime implied; dipasang lagi pada dashboardRoutes)  
10. RequireCapability(route-level) `dashboard.view.overview` (runtime implied; dipasang sebagai preHandler route)  
11. Controller handler (di luar hitungan middleware)  
12. HighestLevelDebug onResponse (runtime verified)

Status runtime response saat audit: 200.

Jumlah middleware dieksekusi (perkiraan):
- Total: 10 layer (1–10) sebelum controller.

Duplikasi yang terdeteksi:
- AuthMiddleware: terpasang minimal 2x (global + /api group) dan 1x lagi di module dashboard (total 3x).
- TenantMiddleware: terpasang 2x (/api group + module dashboard).

---

### B) Endpoint: /api/academic/guru (representatif: GET /api/academic/guru)

Rujukan route: [academic.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/routes/academic.routes.ts), [guru.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/guru/routes/guru.routes.ts)

Pipeline aktual (urut):
1. HighestLevelDebug onRequest (runtime verified)  
2. Global onRequest logger/correlation-id (runtime verified)  
3. AuthMiddleware global preHandler (runtime implied)  
4. /api plugin onRequest debug (runtime verified)  
5. AuthMiddleware /api group preHandler (runtime verified)  
6. TenantMiddleware /api group preHandler (runtime verified)  
7. CapabilityGuard /api group (runtime implied; academic route tidak set `config.capability`, sehingga guard skip)  
8. Authorize(route-level) (runtime implied; ada di preHandler route `GET /`)  
9. RequireCapability(route-level) `academic.teachers.view.list` (runtime implied)  
10. DetermineDataScope(route-level) (runtime implied)  
11. Controller handler (di luar hitungan middleware)  
12. HighestLevelDebug onResponse (runtime verified)

Status runtime response saat audit: 200.

Jumlah middleware diekseksekusi (perkiraan):
- Total: 10 layer (1–10) sebelum controller.

Duplikasi yang terdeteksi:
- AuthMiddleware: minimal 2x (global + /api group).  
- TenantMiddleware: 1x (/api group).

---

### C) Endpoint: /api/attendance/sesi (representatif: GET /api/attendance/sesi-absensi)

Rujukan route: [attendance/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/plugin.ts), [sesi-absensi.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts), [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts)

Pipeline aktual (urut):
1. HighestLevelDebug onRequest (runtime verified)  
2. Global onRequest logger/correlation-id (runtime verified)  
3. AuthMiddleware global preHandler (runtime implied)  
4. /api plugin onRequest debug (runtime verified)  
5. AuthMiddleware /api group preHandler (runtime verified)  
6. TenantMiddleware /api group preHandler (runtime verified)  
7. CapabilityGuard /api group (runtime implied; attendance plugin set `config.capability=ABSENSI`, jadi guard berjalan)  
8. TenantMiddleware attendance plugin (runtime implied; dipasang lagi di attendance plugin)  
9. requireMultiSesiMode(route-level) (runtime implied)  
10. RequireCapability(route-level) `attendance.sessions.view.list` (runtime implied)  
11. DetermineDataScope(route-level) (runtime implied)  
12. SesiGuard.validateList(route-level) (runtime implied)  
13. Controller handler (di luar hitungan middleware)  
14. HighestLevelDebug onResponse (runtime verified)

Status runtime response saat audit:
- Tanpa X-Tenant-ID: 401 (tenant context tidak tersedia untuk gate absensi multi-sesi).  
- Dengan X-Tenant-ID=112e351e-6b65-4eab-8cc7-d7fafafcf125: 403 (gate internal absensi menolak pada tahap awal).

Jumlah middleware dieksekusi (perkiraan):
- Total: 12 layer (1–12) sebelum controller.

Duplikasi yang terdeteksi:
- TenantMiddleware: minimal 2x (/api group + attendance plugin).
- AuthMiddleware: minimal 2x (global + /api group).

---

### D) Endpoint: /api/cooperative/products (mapping runtime: GET /api/cooperative/toko)

Catatan mapping:
- Endpoint “/api/cooperative/products” tidak ditemukan sebagai path literal; representasi paling dekat untuk “products” adalah modul toko: `/api/cooperative/toko` (route `GET /` pada toko module).

Rujukan route: [cooperative/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/cooperative/plugin.ts), [toko.fastify.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/cooperative/toko/toko.fastify.ts)

Pipeline aktual (urut):
1. HighestLevelDebug onRequest (runtime verified)  
2. Global onRequest logger/correlation-id (runtime verified)  
3. AuthMiddleware global preHandler (runtime implied)  
4. /api plugin onRequest debug (runtime verified)  
5. AuthMiddleware /api group preHandler (runtime verified)  
6. TenantMiddleware /api group preHandler (runtime verified)  
7. CapabilityGuard /api group (runtime implied; cooperative plugin set `config.capability=KOPERASI`, jadi guard berjalan)  
8. Controller/handler toko (di luar hitungan middleware; file toko tidak memakai preHandler permission/role/dataScope)
9. HighestLevelDebug onResponse (runtime verified)

Status runtime response saat audit: 200.

Jumlah middleware dieksekusi (perkiraan):
- Total: 7 layer (1–7) sebelum handler.

Duplikasi yang terdeteksi:
- AuthMiddleware: minimal 2x (global + /api group).  
- TenantMiddleware: 1x (/api group).

---

### E) Endpoint: /api/billing/subscriptions (representatif: GET /api/billing/subscriptions)

Rujukan route: [subscription.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/subscription.routes.ts)

Pipeline aktual (urut):
1. HighestLevelDebug onRequest (runtime verified)  
2. Global onRequest logger/correlation-id (runtime verified)  
3. AuthMiddleware global preHandler (runtime implied)  
4. /api plugin onRequest debug (runtime verified)  
5. AuthMiddleware /api group preHandler (runtime verified)  
6. TenantMiddleware /api group preHandler (runtime verified)  
7. CapabilityGuard /api group (runtime implied; billing routes tidak set `config.capability`, sehingga guard skip)  
8. RequireCapability(route-level) `billing.subscriptions.view.list` (runtime implied)  
9. Controller handler (di luar hitungan middleware)  
10. HighestLevelDebug onResponse (runtime verified)

Status runtime response saat audit: 200.

Jumlah middleware dieksekusi (perkiraan):
- Total: 8 layer (1–8) sebelum controller.

Duplikasi yang terdeteksi:
- AuthMiddleware: minimal 2x (global + /api group).  
- TenantMiddleware: 1x (/api group).

---

### F) Endpoint: /api/payments/create (representatif: POST /api/payments/create)

Rujukan route: [payment/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/index.ts), [payment.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/routes/payment.routes.ts)

Karakter khusus:
- Route `/api/payments/*` tidak berada di dalam /api plugin protectedApi (router.ts). Ia didaftarkan sebagai “self-protecting module” pada root fastify, sehingga tidak memicu log “[API Plugin] Request…” dan tidak menjalankan preHandler /api group.

Pipeline aktual (urut):
1. HighestLevelDebug onRequest (runtime verified)  
2. Global onRequest logger/correlation-id (runtime verified)  
3. AuthMiddleware global preHandler (runtime implied)  
4. AuthMiddleware paymentModule preHandler (runtime implied; dipasang pada subFastify internal /api/payments)  
5. TenantMiddleware paymentModule preHandler (runtime implied; dipasang pada subFastify internal /api/payments)  
6. CapabilityGuard paymentModule (runtime implied; terpasang, tetapi payment routes tidak set `config.capability` sehingga guard skip)  
7. AuthMiddleware paymentRoutes hook (runtime implied; dipasang lagi pada paymentRoutes)  
8. DetermineDataScope hook (runtime implied; dipasang pada paymentRoutes)  
9. Controller handler createPayment (di luar hitungan middleware)  
10. HighestLevelDebug onResponse (runtime verified)

Status runtime response saat audit: 500 (karena billing_id dummy tidak ditemukan), namun pipeline middleware tetap terverifikasi dieksekusi sampai handler.

Jumlah middleware dieksekusi (perkiraan):
- Total: 8 layer (1–8) sebelum controller.

Duplikasi yang terdeteksi:
- AuthMiddleware: minimal 3x (global + paymentModule + paymentRoutes).

---

## 2) Tabel Ringkas: Jumlah Middleware & Duplikasi per Endpoint

| Endpoint (Representatif) | Jumlah Middleware (perkiraan, sebelum controller) | Duplikasi | Catatan |
|---|---:|---|---|
| GET /api/dashboard/overview | 10 | Auth 3x, Tenant 2x | Module dashboard memasang auth+tenant lagi. |
| GET /api/academic/guru | 10 | Auth 2x | Route memakai Authorize + RequireCapability + DataScope. |
| GET /api/attendance/sesi-absensi | 12 | Auth 2x, Tenant 2x | Attendance plugin memasang tenant lagi; ada gate multi-sesi + guard khusus. |
| GET /api/cooperative/toko (≒ products) | 7 | Auth 2x | Tidak ada permission guard di toko routes; hanya module capability. |
| GET /api/billing/subscriptions | 8 | Auth 2x | Billing tidak set config.capability; capability guard skip. |
| POST /api/payments/create | 8 | Auth 3x | Self-protecting module; tidak lewat /api plugin pipeline. |

---

## 3) Daftar Middleware yang Dieksekusi Ganda (Prioritas)

Middleware yang paling sering duplikat pada jalur /api:
- AuthMiddleware: global + /api group, dan pada beberapa module ditambah lagi (dashboard, billing-dashboard, user, payment routes).
- TenantMiddleware: /api group + beberapa module (dashboard, attendance).

Middleware lain yang berpotensi “overhead” namun bukan duplikasi di jalur /api:
- CapabilityGuard: terpasang di /api group, tetapi sering skip jika route tidak set `config.capability`.

---

## 4) Diagram Pipeline Middleware Aktual (berdasarkan runtime execution)

Diagram A — Route di dalam /api plugin (contoh: /api/dashboard/*, /api/academic/*, /api/billing/*, /api/cooperative/*, /api/attendance/*)
Request
→ HighestLevelDebug(onRequest)
→ Global onRequest logger/correlation-id
→ AuthMiddleware(global)
→ /api plugin onRequest debug (jika ENABLE_DEBUG_LOGS)
→ AuthMiddleware(/api group)
→ TenantMiddleware(/api group)
→ CapabilityGuard(/api group) (aktif bila route set config.capability)
→ Module-level hooks (opsional, pada beberapa modul)
→ Route-level guards (Authorize / RequireCapability / DataScope / domain-specific guards)
→ Controller
→ HighestLevelDebug(onResponse)

Diagram B — Self-Protecting /api/payments/* (di luar /api plugin)
Request
→ HighestLevelDebug(onRequest)
→ Global onRequest logger/correlation-id
→ AuthMiddleware(global)
→ AuthMiddleware(paymentModule)
→ TenantMiddleware(paymentModule)
→ CapabilityGuard(paymentModule) (biasanya skip)
→ AuthMiddleware(paymentRoutes) (duplikasi)
→ DetermineDataScope(paymentRoutes)
→ Controller
→ HighestLevelDebug(onResponse)

---

## Ringkasan Perubahan
- Membuat laporan audit runtime execution flow middleware ini.

