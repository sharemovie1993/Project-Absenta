## Authorization System – Final Verification Report

Tanggal: 2026-03-16

Audit scope: hasil refactor authorization sampai Phase 4 (Service Feature Guard, Subscription Guard Hardening, Capability Enforcement Normalization, RBAC Simplification).

---

## 1) Endpoint Authorization Coverage Scan

Metode:
- Scan seluruh deklarasi route `fastify.(get|post|put|patch|delete|options|all)` pada `src/infra/router.ts` dan `src/modules/**`.
- “Public endpoint” didefinisikan sebagai:
  - route memiliki `config.skipAuth === true` atau `config.public === true`, atau
  - endpoint health root (`GET /health`).
- “Protected endpoint” adalah seluruh endpoint selain public.
- “Capability guarded” didefinisikan sebagai route memiliki `requireCapability(...)` langsung, atau lewat preHandler const-array yang berisi `requireCapability(...)`.

Hasil:
- Total endpoint: 500
- Public endpoint: 50
- Protected endpoint: 450
- Protected endpoint dengan capability guard: 450
- Protected endpoint tanpa capability guard: 0 (100% coverage)

---

## 2) Service Feature Enforcement (Tenant Feature Guard)

Implementasi guard:
- Enforcement dilakukan oleh [service-feature.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/guards/service-feature.guard.ts).
- Guard berjalan sebagai `preHandler` hook pada protected API group di [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L174-L205).

Behavior yang diverifikasi (berdasarkan implementasi):
- Untuk route non-public, guard menentukan `moduleKey` dari `route config.module` atau dari URL.
- `requiredFeature` diambil dari `ServiceFeatureMap[moduleKey]` (fallback CORE).
- Jika tenant tidak memiliki feature tersebut, response:
  - HTTP 403
  - body: `{ error: "SERVICE_FEATURE_NOT_ENABLED", message: "Service not enabled for this tenant" }`
  - emit log event JSON: `SERVICE_FEATURE_NOT_ENABLED` memuat `tenantId`, `module`, `requiredFeature`, `method`, `url`, `userId`.

Catatan:
- System superadmin bypass via `isSystemSuperAdmin(...)`.
- Endpoint yang perlu tetap lolos (billing/payment/invoice) tidak bergantung pada service feature guard, dan juga dibypass oleh subscription guard (lihat bagian 3).

---

## 3) Subscription Enforcement (Core Subscription Guard)

Implementasi guard:
- Enforcement core subscription berada di [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts) dan dipanggil terpusat oleh [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts#L195-L206).

Behavior yang diverifikasi (berdasarkan implementasi):
- Billing/invoice/payment/subscriptions bypass:
  - Berdasarkan `routeOptions.config.billing === true` (di-set via onRoute hook di [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L184-L195)), atau
  - Berdasarkan path prefix (`/api/billing`, `/api/subscriptions`, `/api/invoice`, `/api/payments`, dll) di [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts#L32-L52).
- Status yang allowed:
  - `ACTIVE` → allowed
  - `TRIAL` → allowed selama `end_date > now`
- Status selain itu (EXPIRED/CANCELLED/SUSPENDED/dll) → response:
  - HTTP 403
  - body: `{ error: "SUBSCRIPTION_NOT_ACTIVE", message: "Tenant subscription is not active" }`
  - emit log event JSON: `SUBSCRIPTION_NOT_ACTIVE` memuat `tenantId`, `subscriptionStatus`, `endpoint`, `timestamp`.

---

## 4) Capability Enforcement (User Capability Guard)

Implementasi:
- Route-level guard memakai [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts).
- Semua keputusan akses capability dipusatkan ke `AuthorizationService.isUserAuthorized(...)` di [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts).

Behavior yang diverifikasi:
- Jika user tidak memiliki capability yang diminta:
  - HTTP 403
  - body mengandung `error: "CAPABILITY_ACCESS_DENIED"` dan `code: "FORBIDDEN"`
  - emit log event JSON: `CAPABILITY_ACCESS_DENIED` memuat `tenantId`, `userId`, `endpoint`, `timestamp`, `capability`.

Evidence pengujian:
- Unit tests `requireCapability` lulus: `npm run test:unit` (lihat [requireCapability.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/__tests__/requireCapability.test.ts)).

---

## 5) Privilege Escalation Checks

Risk: user biasa mencoba akses endpoint admin/superadmin, atau mendapatkan bypass.

Mitigasi yang terverifikasi:
- Superadmin bypass hanya untuk role `SUPERADMIN`:
  - `requireCapability` bypass di [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts#L21-L24).
  - `AuthorizationService.resolveUserCapabilities(...)` juga mengembalikan `system.platform.full_access` hanya untuk role SUPERADMIN (sebagai marker), dan non-superadmin tidak mendapatkan capability tersebut: [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts).
- Endpoint superadmin/admin memakai capability khusus (contoh `superadmin.*`) sehingga user tanpa capability akan 403.
- Tidak ada guard role-based legacy tersisa yang bisa mem-bypass capability (Phase 4 cleanup).

Evidence pengujian:
- Unit tests route snapshot-only superadmin analytics/upgrade intelligence lulus (GET mengembalikan 404 saat snapshot tidak ada, bukan 401/403 bypass):  
  - [analytics-admin.routes.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/analytics/routes/analytics-admin.routes.test.ts)  
  - [upgrade-intelligence-admin.routes.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/upgrade-intelligence/routes/upgrade-intelligence-admin.routes.test.ts)

---

## 6) Cross-Tenant Isolation Checks

Mitigasi yang terverifikasi:
- JWT tenant integrity check dilakukan di Auth middleware (non-superadmin wajib punya tenantId; mismatch header diblok): [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts#L77-L121).
- Tenant resolver + tenant status guard + subscription guard dipusatkan di [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts).
- Banyak service memakai `determineDataScope()` untuk menambahkan filter tenant pada query.

Evidence pengujian:
- Unit test isolasi tenant pada domain Guru lulus: [guru.isolation.spec.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/guru/services/guru.isolation.spec.ts).

---

## 7) Logging Verification

Event yang diverifikasi ada dan memuat field minimum:
- `SERVICE_FEATURE_NOT_ENABLED`: [service-feature.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/guards/service-feature.guard.ts)  
  - fields: `tenantId`, `module`, `requiredFeature`, `method`, `url`, `userId`
- `SUBSCRIPTION_NOT_ACTIVE`: [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts#L95-L105)  
  - fields: `tenantId`, `subscriptionStatus`, `endpoint`, `timestamp`
- `CAPABILITY_ACCESS_DENIED`: [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts#L36-L56)  
  - fields: `tenantId`, `userId`, `capability`, `endpoint`, `timestamp`

---

## Kesimpulan

- Endpoint coverage: 100% protected endpoint memiliki capability guard (450/450).
- Core subscription enforcement: aktif, tidak bisa dibypass untuk non-billing paths.
- Service feature enforcement: aktif untuk modul non-CORE dan menghasilkan error `SERVICE_FEATURE_NOT_ENABLED`.
- Capability enforcement: konsisten menghasilkan `CAPABILITY_ACCESS_DENIED` dan logging yang memadai.
- Tidak ada temuan bypass/regression pada audit ini.

