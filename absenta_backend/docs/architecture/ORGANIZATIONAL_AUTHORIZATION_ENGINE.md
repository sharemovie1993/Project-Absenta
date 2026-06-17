## Organizational Authorization Engine

Tanggal: 2026-03-16

Dokumen ini menjelaskan implementasi Organizational Authorization Engine dan status cleanup schema organisasi legacy.

---

## Model Aktif

Model organisasi aktif (satu-satunya sumber runtime):
- `OrganizationalPosition`
- `OrganizationalAssignment`
- `OrganizationalCapability`

Referensi:
- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma)

---

## Legacy Model (Dihapus)

Model legacy berikut telah dihapus dari Prisma schema dan database:
- `StrukturOrganisasi`
- `GuruStrukturOrganisasi`
- `SiswaStrukturOrganisasi`
- `StrukturPermission`

Migration cleanup:
- [20260316093000_remove_legacy_organizational_models/migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260316093000_remove_legacy_organizational_models/migration.sql)

---

## Engine & Integrasi

Komponen utama:
- Engine: [organizational-authorization.engine.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/organizational-authorization.engine.ts)
- Cache context (TTL 300s): [organizational-context-cache.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/organizational-context-cache.ts)
- Authorization integration: [authorization.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts)
- Pipeline middleware: [organizationalScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/organizationalScope.ts)

Dokumen implementasi detail:
- [ORGANIZATIONAL_AUTHORIZATION_ENGINE_IMPLEMENTATION.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/architecture/ORGANIZATIONAL_AUTHORIZATION_ENGINE_IMPLEMENTATION.md)

