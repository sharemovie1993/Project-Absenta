# Laporan: Middleware Removal Plan (Eliminasi Duplikasi) – Absenta Backend

Ditujukan untuk: Pak Asep  
Tujuan tahap ini: menyusun rencana penghapusan middleware duplikat sebelum refactor dilakukan (tanpa refactor).

Referensi:
- Instruksi: [05 Instruksi Tahap Selanjutnya - Middleware Removal Plan.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/Hardengin%20Layer%20Middleware/05%20Instruksi%20Tahap%20Selanjutnya%20-%20Middleware%20Removal%20Plan.md)
- Kernel pipeline: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts), [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- Runtime execution audit: [file_laporan_audit_middleware_execution_flow_runtime.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/file_laporan_audit_middleware_execution_flow_runtime.md)

---

## 1) Daftar Middleware per Level (Kondisi Saat Ini)

### 1.1 Global level
- AuthMiddleware terpasang sebagai `preHandler` global: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
- onRequest logger/correlation-id (global hook): [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)
- error handler global: [bootstrap.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/bootstrap.ts)

### 1.2 /api plugin level (protectedApi)
- AuthMiddleware dipasang lagi sebagai `preHandler` pada /api group: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- TenantMiddleware dipasang sebagai `preHandler` pada /api group: [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)
- CapabilityGuard dipasang sebagai plugin (preHandler guard): [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts)

### 1.3 Module level (contoh yang memasang middleware sendiri)
- Dashboard module: Auth + Tenant: [dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/routes/dashboard.routes.ts)
- Attendance module: Tenant (duplikat) + module capability via onRoute: [attendance/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/plugin.ts)
- Billing dashboard module: Auth + Tenant + DataScope: [billing-dashboard.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/billing-dashboard.routes.ts)
- User module: Auth + Tenant: [user.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/user/routes/user.routes.ts)
- Academic struktur-organisasi module: Auth (module-level) + authorize (module-level): [struktur-organisasi.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/struktur-organisasi/routes/struktur-organisasi.routes.ts)
- PDF module: Auth: [pdf.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/pdf/routes/pdf.routes.ts)
- Self-protecting modules (di luar /api plugin) memasang middleware sendiri:
  - Invoice: Auth + Tenant + CapabilityGuard: [invoice/plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/plugin.ts)
  - Payment: Auth + Tenant + CapabilityGuard (+ auth lagi di paymentRoutes): [payment/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/index.ts), [payment.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/routes/payment.routes.ts)
  - Notification: Auth (3 prefix) meski ada `config.skipAuth` untuk beberapa route: [notification/index.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/notification/index.ts)

---

## 2) Middleware yang Harus Hanya Ada Sekali

- AuthMiddleware
- TenantMiddleware
- CapabilityGuard (ServiceCapability)

---

## 3) Tabel Removal Plan (Middleware / Lokasi Saat Ini / Lokasi Target / Status)

| Middleware | Lokasi Saat Ini | Lokasi Target | Status |
|---|---|---|---|
| AuthMiddleware | global + /api plugin + module-level (beberapa modul) | global saja | HAPUS duplikasi pada /api plugin dan module-level |
| TenantMiddleware | /api plugin + module-level + self-protecting modules | /api plugin saja | HAPUS duplikasi pada module-level dan self-protecting modules |
| CapabilityGuard | /api plugin + self-protecting modules (invoice/payment) | /api plugin saja | HAPUS duplikasi pada invoice/payment |
| DetermineDataScope | route-level dan beberapa module-level hook | route-level saja (sesuai kebutuhan endpoint) | STANDARKAN pemakaian, hindari dipasang sebagai hook “all routes” tanpa kebutuhan |
| Authorize (role check) | route-level dan beberapa module-level hook | route-level saja (sementara) | KONSOLIDASI nanti ke PermissionMiddleware (sesuai blueprint), bukan fokus removal plan |

---

## 4) Daftar Modul yang Memasang Middleware Sendiri (Target Removal)

Modul yang perlu dibersihkan dari pemasangan Auth/Tenant/Capability guard di level modul:
- dashboard
- attendance
- billing-dashboard
- user
- pdf
- academic/struktur-organisasi
- payment (self-protecting + paymentRoutes)
- invoice (self-protecting + invoiceRoutes)
- notification (self-protecting)

---

## 5) Removal Actions per Modul (Apa yang Dihapus)

Catatan: ini rencana “penghapusan duplikasi” saja; tidak membahas pemecahan tenant middleware atau standardisasi public config secara penuh (itu tahap refactor berikutnya).

- dashboard:
  - Hapus pemasangan AuthMiddleware dan TenantMiddleware di level module.
- attendance:
  - Hapus pemasangan TenantMiddleware di attendance plugin (karena sudah ada di /api plugin).
  - Pertahankan `config.capability` via onRoute untuk ABSENSI (tetap memicu CapabilityGuard di /api plugin).
- billing-dashboard:
  - Hapus pemasangan AuthMiddleware dan TenantMiddleware di level module.
  - Pastikan DataScope tetap route-level (bukan hook global module).
- user:
  - Hapus pemasangan AuthMiddleware dan TenantMiddleware di level module.
- pdf:
  - Hapus pemasangan AuthMiddleware di level module, pindahkan ke pipeline platform.
- academic/struktur-organisasi:
  - Hapus pemasangan AuthMiddleware di level module (karena sudah ada di pipeline platform).
  - Pertahankan authorize/permission di route-level.
- invoice (self-protecting):
  - Hapus pemasangan AuthMiddleware, TenantMiddleware, dan CapabilityGuard dari invoice plugin.
  - Targetkan invoice protected routes agar lewat /api plugin pipeline.
- payment (self-protecting):
  - Hapus pemasangan AuthMiddleware, TenantMiddleware, dan CapabilityGuard dari payment module.
  - Hapus pemasangan AuthMiddleware di paymentRoutes (duplikat dalam konteks pipeline platform).
- notification (self-protecting):
  - Hapus pemasangan AuthMiddleware di notification module.
  - Tetap gunakan `config.skipAuth` untuk endpoint public yang memang perlu public (tanpa whitelist prefix).

---

## 6) Diagram Pipeline Setelah Duplikasi Dihapus (Target)

Target pipeline untuk endpoint protected yang berada di dalam /api plugin:
Request
→ Global onRequest (logging/correlation-id)
→ AuthMiddleware (global, 1x)
→ TenantMiddleware (/api plugin, 1x)
→ CapabilityGuard (/api plugin, 1x, aktif jika route set config.capability)
→ Route-level guards (Authorize / RequireCapability / DetermineDataScope / domain guards)
→ Controller
→ onResponse (observability/cache)

Target pipeline untuk module yang saat ini “self-protecting”:
Request
→ Global onRequest (logging/correlation-id)
→ AuthMiddleware (global, 1x)
→ TenantMiddleware (/api plugin, 1x)
→ CapabilityGuard (/api plugin, 1x bila perlu)
→ Route-level guards
→ Controller
→ onResponse (observability/cache)

---

## Ringkasan Perubahan
- Membuat dokumen removal plan eliminasi middleware duplikat (dokumen ini).

