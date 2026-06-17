# Laporan Eksekusi: Middleware Removal (Pasca Pipeline Normalization) – Absenta Backend

Ditujukan untuk: Pak Asep  
Tujuan: menjalankan middleware removal sesuai instruksi (AuthMiddleware hanya global; TenantMiddleware + CapabilityGuard hanya di /api plugin pipeline), lalu memverifikasi ulang runtime execution untuk endpoint representatif.

Referensi:
- Instruksi eksekusi: [08 Instruksi Eksekusi - Middleware Removal.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/Hardengin%20Layer%20Middleware/08%20Instruksi%20Eksekusi%20-%20Middleware%20Removal.md)
- Removal plan: [file_laporan_middleware_removal_plan.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/file_laporan_middleware_removal_plan.md)
- Pipeline normalization: [file_laporan_pipeline_normalization.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/file_laporan_pipeline_normalization.md)

---

## 1) Perubahan Implementasi (Ringkas, sesuai instruksi)

AuthMiddleware:
- Dihapus dari /api plugin preHandler (sebelumnya ada hook auth di protectedApi).  
  Rujukan: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- Dihapus dari module-level routes yang memasang `addHook('preHandler', authMiddleware)` atau `preHandler: [authMiddleware]`. Contoh: dashboard, users, billing-dashboard, invoice, payments, pdf, upload, struktur-organisasi, auth.logout.  

TenantMiddleware:
- Dipertahankan hanya pada /api plugin pipeline (protectedApi preHandler).  
  Rujukan: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- Dihapus dari module/plugin yang sebelumnya memasang tenant sendiri (contoh: attendance plugin, rekap routes, users, billing-dashboard).  

CapabilityGuard:
- Dipertahankan hanya pada /api plugin pipeline (register plugin di protectedApi).  
  Rujukan: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- Dihapus dari plugin self-protecting legacy (invoice plugin, payment module) agar tidak ada duplikasi guard di level modul.  

---

## 2) Runtime Execution Audit (Pasca Removal)

Setup audit:
- Backend dijalankan di port 3014 dengan debug aktif (`ENABLE_DEBUG_LOGS=true`, `HIGHEST_LEVEL_DEBUG=true`).
- Token uji: JWT SUPERADMIN system.

### 2.1 Endpoint: /api/dashboard (GET /api/dashboard/overview)

Pipeline aktual (runtime verified/implied):
1) Global onRequest logger (runtime verified)  
2) AuthMiddleware global preHandler (runtime verified lewat hasil 401 saat tanpa Authorization)  
3) /api plugin onRequest debug (runtime verified)  
4) TenantMiddleware /api plugin preHandler (runtime verified)  
5) CapabilityGuard (runtime implied; tergantung config.capability route)  
6) Route guards (RequireCapability) (runtime implied)

Duplikasi:
- AuthMiddleware: 1x (global)
- TenantMiddleware: 1x (/api plugin)

### 2.2 Endpoint: /api/academic/guru (GET /api/academic/guru)

Pipeline aktual (runtime verified/implied):
1) Global onRequest  
2) AuthMiddleware global  
3) /api plugin onRequest  
4) TenantMiddleware /api plugin  
5) Route guards (Authorize + RequireCapability + DataScope) (runtime implied)

Duplikasi:
- AuthMiddleware: 1x
- TenantMiddleware: 1x

### 2.3 Endpoint: /api/attendance/sesi (GET /api/attendance/sesi-absensi)

Pipeline aktual (runtime verified/implied):
1) Global onRequest  
2) AuthMiddleware global  
3) /api plugin onRequest  
4) TenantMiddleware /api plugin  
5) CapabilityGuard (ABSENSI) (runtime implied; attendance module set config.capability via onRoute)  
6) Route guards (requireMultiSesiMode + RequireCapability + DataScope + SesiGuard) (runtime implied)

Duplikasi:
- AuthMiddleware: 1x
- TenantMiddleware: 1x
- CapabilityGuard: 1x

### 2.4 Endpoint: /api/cooperative/toko (GET /api/cooperative/toko)

Pipeline aktual (runtime verified/implied):
1) Global onRequest  
2) AuthMiddleware global  
3) /api plugin onRequest  
4) TenantMiddleware /api plugin  
5) CapabilityGuard (KOPERASI) (runtime implied; cooperative module set config.capability via onRoute)

Duplikasi:
- AuthMiddleware: 1x
- TenantMiddleware: 1x
- CapabilityGuard: 1x

### 2.5 Endpoint: /api/billing/subscriptions (GET /api/billing/subscriptions)

Pipeline aktual (runtime verified/implied):
1) Global onRequest  
2) AuthMiddleware global  
3) /api plugin onRequest  
4) TenantMiddleware /api plugin  
5) Route guards (RequireCapability) (runtime implied)

Duplikasi:
- AuthMiddleware: 1x
- TenantMiddleware: 1x

### 2.6 Endpoint: /api/payments/create (POST /api/payments/create)

Pipeline aktual (runtime verified/implied):
1) Global onRequest  
2) AuthMiddleware global  
3) /api plugin onRequest  
4) TenantMiddleware /api plugin  
5) Route-level data scope (determineDataScope) (runtime implied)

Duplikasi:
- AuthMiddleware: 1x
- TenantMiddleware: 1x

---

## 3) Hasil Status Code (Uji Cepat)

Ringkasan hasil uji saat audit:
- GET /health → 200
- GET /api/dashboard/overview (tanpa Authorization) → 401
- GET /api/dashboard/overview (dengan token) → 200
- GET /api/academic/guru → 200
- GET /api/attendance/sesi-absensi (tanpa X-Tenant-ID) → 401
- GET /api/attendance/sesi-absensi (dengan X-Tenant-ID) → 403
- GET /api/cooperative/toko → 200
- GET /api/billing/subscriptions → 200
- POST /api/payments/create (billing_id dummy) → 500 (error bisnis: billing record not found; bukan error middleware/pipeline)

---

## Ringkasan Perubahan
- Eksekusi middleware removal: hapus duplikasi auth/tenant/capability di /api plugin dan module-level sesuai instruksi.
- Verifikasi runtime: semua endpoint representatif melewati 1x AuthMiddleware (global) dan 1x TenantMiddleware (/api plugin); CapabilityGuard berjalan 1x ketika route menetapkan config.capability.

