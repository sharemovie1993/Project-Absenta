## Action Catalog

Tanggal: 2026-03-16

Action Catalog adalah sumber kebenaran (canonical) untuk seluruh capability authorization di platform Absenta.

Source of truth canonical:
- [action_catalog_canonical_futureproof.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/action_catalog_canonical_futureproof.md)

---

## Status Cleanup (Legacy Removed)

Mulai migration cleanup Action Catalog:
- Permission table di-reset dan di-seed ulang hanya dari canonical catalog.
- Legacy capability (manage_*/view_* dan varian underscore) tidak lagi menjadi bagian dari Permission seed.

Rujukan audit:
- [ACTION_CATALOG_AUDIT.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/architecture/ACTION_CATALOG_AUDIT.md)

Rujukan migration:
- [20260316101000_action_catalog_cleanup/migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260316101000_action_catalog_cleanup/migration.sql)

---

## Seeding

Seeder membuat Permission ID persis sama dengan Action ID (capability):
- [seed_policies.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed_policies.ts)

Kebijakan penting:
- Permission seed hanya membaca file canonical.
- RolePermissions di-set strict ke baseline canonical (system roles).

