## Sidebar Rendering Engine

Tanggal: 2026-03-16

Tujuan dokumen ini adalah menjelaskan implementasi Sidebar Rendering Engine (backend) yang membangun sidebar secara dinamis berdasarkan:
- capability user (Action Catalog / Permission ID)
- feature subscription tenant
- organizational assignment (petugasActive)
- konfigurasi menu di database

---

## Arsitektur

Komponen:
- Service: [sidebar-rendering.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/sidebar-rendering.service.ts)
- Endpoint: `GET /api/menu/sidebar`
  - Implementasi controller: [menu.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/controllers/menu.controller.ts)
  - Route: [menu.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/routes/menu.routes.ts)

Sumber menu configuration:
- Tabel `Menu` (database-driven)
  - schema: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1760-L1776)

---

## Kontrak Context

`getSidebarForUser(context)` menerima:
- `userId`
- `role` (untuk SUPERADMIN bypass capability filter)
- `capabilities` (Action IDs)
- `tenantFeatures` (mis. CORE/ABSENSI/KOPERASI dari subscription plan)
- `organizationalScope.petugasActive` (true jika SISWA aktif sebagai PETUGAS_KELAS)

---

## Filtering Rules

### 1) Load Menu

Query:
- `Menu.findMany({ where: { is_active: true }, orderBy: { order: 'asc' } })`

Field yang dipakai:
- `id, parent_id, name, path, icon, order`
- `required_capability`
- `required_features`
- `requires_petugas_active`

### 2) Feature Filter

- Jika `required_features` ada:
  - semua feature di `required_features` wajib ada di `tenantFeatures`
  - jika tidak, item menu di-skip

Tenant features diambil dari:
- [tenant-entitlement.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/tenant-entitlement.service.ts)

### 3) Capability Filter

- Jika `required_capability` ada:
  - SUPERADMIN → allow
  - selain SUPERADMIN → harus ada di `context.capabilities`

Capability diambil dari:
- [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts)

### 4) Organizational Condition Filter

- Jika `requires_petugas_active = true`:
  - butuh `context.organizationalScope.petugasActive === true`

`petugasActive` dihitung di endpoint menggunakan `OrganizationalAssignment` aktif (`Position.code = 'PETUGAS_KELAS'`).

---

## Build Tree

Proses:
- Buat map `id -> node`
- Link child berdasarkan `parent_id`
- Node yang parent-nya tidak tersedia (karena ter-filter) menjadi root

Output node:
- `id, name, path, icon, order, children`

---

## Parent Visibility Rule

Rule:
- Node group (tanpa `path`) hanya tampil jika memiliki `children` visible.

---

## Sidebar Cache

Cache layer:
- Redis + memory via [cache.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts)

Key:
- `sidebar:user:{userId}`

TTL:
- 300 seconds

---

## Cache Invalidation

Saat invalidasi:
- perubahan menu config (`Menu` / `MenuRole`)
  - [menu.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/menu.service.ts)
- perubahan organizational assignment/position/capabilities
  - [organizational.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/organizational/services/organizational.service.ts)
- perubahan role user atau role permissions (best-effort)
  - [user.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/user/services/user.service.ts)
- perubahan subscription (best-effort global invalidation + tenant features cache)
  - [subscription.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/subscription.service.ts)

---

## Endpoint

Endpoint baru:
- `GET /api/menu/sidebar`

Response:
- `{ sidebar: [...] }`

---

## Verification

Unit tests:
- [sidebar-rendering.service.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/__tests__/sidebar-rendering.service.test.ts)

