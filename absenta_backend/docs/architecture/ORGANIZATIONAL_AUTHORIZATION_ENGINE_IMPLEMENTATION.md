## Implementasi – Organizational Authorization Engine

Tanggal: 2026-03-16

Implementasi ini membangun “Organizational Authorization Engine” agar capability tambahan dan data scope berbasis struktur organisasi konsisten di seluruh backend Absenta.

---

## Ringkasan Perubahan

### Database (Model Baru + Migrasi Data)

- Menambahkan tabel baru:
  - `OrganizationalPosition`
  - `OrganizationalAssignment`
  - `OrganizationalCapability`
- Migrasi data dari model legacy:
  - `StrukturOrganisasi` → `OrganizationalPosition`
  - `GuruStrukturOrganisasi`/`SiswaStrukturOrganisasi` → `OrganizationalAssignment`
  - `StrukturPermission` → `OrganizationalCapability`

Referensi:
- Schema: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma)
- Migration: [migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260316090000_organizational_authorization_engine/migration.sql)

### Engine Baru

- Engine: [organizational-authorization.engine.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/organizational-authorization.engine.ts)
  - `resolveOrganizationalContext(userId)`
  - `resolveOrganizationalCapabilities(userId)`
  - `resolveDataScope(userId)`

### Integrasi ke AuthorizationService

- `AuthorizationService.resolveUserCapabilities()` memanggil engine untuk menambahkan capability organisasi setelah role capabilities.
  - Referensi: [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts)

### OrganizationalScopeMiddleware + Pipeline

- Middleware baru: [organizationalScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/organizationalScope.ts)
- Dipasang di pipeline protected API setelah CapabilityGuard:
  - [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L196-L204)

Output middleware:
- `request.organizationalScope = { kelas_ids, unit_ids, tenant_wide }`

### Endpoint Manajemen Struktur Baru

Endpoint baru di bawah `/api/academic`:
- `GET /academic/organizational-positions`
- `POST /academic/organizational-positions`
- `PUT /academic/organizational-positions/:id`
- `DELETE /academic/organizational-positions/:id`
- `PUT /academic/organizational-positions/:id/capabilities`
- `POST /academic/organizational-assignments`
- `DELETE /academic/organizational-assignments/:id`

Referensi:
- [organizational.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/organizational/routes/organizational.routes.ts)
- Registered: [academic.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/routes/academic.routes.ts)

### Sinkronisasi Modul Existing

- Wali Kelas assignment akan membuat/menjaga assignment di tabel baru saat wali kelas di-set/nonaktif:
  - [wali-kelas.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/wali-kelas/services/wali-kelas.service.ts)
- Petugas Kelas assignment akan membuat/menjaga assignment di tabel baru saat assign/unassign petugas:
  - [petugas.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/petugas/services/petugas.service.ts)

### Enforcement Scope Minimal

- `determineDataScope()` sekarang membaca `request.organizationalScope` (tanpa query DB struktur legacy) dan mengisi:
  - `scope.kelasIds`, `scope.unitIds`, `scope.tenantWide`
  - Referensi: [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts)
- Query siswa dibatasi sesuai `kelasIds` saat user tidak self-scoped:
  - [get-all-siswa.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/queries/get-all-siswa.query.ts)
  - [get-siswa-by-id.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/queries/get-siswa-by-id.query.ts)
  - [bulk-update-status.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/commands/bulk-update-status.command.ts)
  - [send-parent-access.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/siswa/services/commands/send-parent-access.command.ts)
- Guard sesi absensi memakai `request.organizationalScope.kelas_ids`/`tenant_wide` (bukan query struktur legacy):
  - [sesi.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts)

---

## Verification

- `npm run build` sukses
- `npm run test:unit` sukses (migrations termasuk `20260316090000_organizational_authorization_engine` ter-apply)

