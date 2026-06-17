## RBAC Model

Tanggal: 2026-03-16

Dokumen ini menjelaskan model RBAC platform Absenta setelah migrasi ke Action Catalog canonical dan Organizational Authorization Engine.

---

## Prinsip

- Role sistem terbagi menjadi dua ranah utama:
  1. **Ranah Tenant (Sekolah)**: `ADMIN`, `GURU`, `SISWA` (terikat ke `tenant_id = null` sebagai global template, atau `tenant_id = <school_id>` untuk custom role sekolah).
  2. **Ranah Platform (Absenta.id)**: `SUPERADMIN`, `PLATFORM_FINANCE`, `PLATFORM_SUPPORT`, `PLATFORM_INFRASTRUCTURE` (terikat secara eksklusif ke `tenant_id = 'system'`).
- Spesialisasi kewenangan sekolah (mis. ADMIN_AKADEMIK/ADMIN_KOPERASI/ADMIN_KEUANGAN, WALIKELAS, PETUGAS_KELAS) tidak dibuat sebagai role baru, tetapi diberikan melalui `OrganizationalPosition` + `OrganizationalCapability`.
- Deteksi konteks operasional:
  * **Platform Context**: Diidentifikasi secara konsisten di tingkat database, backend, dan frontend melalui penanda `tenant_id === 'system'` (baik untuk entitas User maupun entitas Role).
  * **Tenant Context**: Diidentifikasi jika `tenant_id !== 'system'`.


---

## Baseline Capability per Role

Sumber canonical capability:
- [action_catalog_canonical_futureproof.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/action_catalog_canonical_futureproof.md)

### SUPERADMIN

- Semua capability canonical (full access).

### ADMIN (core platform baseline)

- dashboard.view.overview
- core.sekolah.view.profile
- core.sekolah.update.profile
- core.users.view.list
- core.users.create
- core.users.update
- notify.check.status
- notify.push.view.subscriptions
- billing.my_subscription.view

### GURU (read & personal workflow baseline)

- dashboard.view.overview
- academic.teaching.view
- academic.teaching.rekap
- attendance.recap.view.daily
- attendance.recap.view.monthly
- notify.view.my
- notify.update.preferences

### SISWA (personal baseline)

- core.auth.logout
- dashboard.view.overview
- attendance.recap.view.daily
- attendance.recap.view.monthly
- notify.view.my
- notify.update.preferences

### PLATFORM_FINANCE (internal finance & billing)

- billing.manage.billings
- billing.manage.plans
- billing.manage.subscriptions
- billing.monitoring.view.live.status
- billing.plans.create
- billing.plans.delete
- billing.plans.update
- billing.plans.view.detail
- billing.plans.view.list
- billing.reports.view.summary
- billing.view.billings
- billing.view.subscriptions
- billing.revenue.view
- superadmin.revenue.view.overview
- payments.test.simulate

### PLATFORM_SUPPORT (customer service & support)

- core.tenants.update
- superadmin.tenants.manage
- platform.tenants.view.list
- superadmin.upgrade.intelligence.view
- superadmin.risk.view
- core.users.view.list
- core.users.reset.password

### PLATFORM_INFRASTRUCTURE (IT & DevOps monitoring)

- superadmin.infra.monitoring.view
- superadmin.infra.view.socket.global
- superadmin.infra.view.socket.tenants
- system.workers.view
- system.health.view
- system.logs.view
- system.feature.flags.manage
- academic.backups.view.list
- academic.backups.create

Implementasi baseline seed:
- [seed_policies.ts](file:///C:/Users/SERVER-DELL/Documents/Project%20Absenta/absenta_backend/src/database/seeds/seed_policies.ts)

---

## Organizational Capability Extension

Pemberian capability tambahan dilakukan melalui:
- `OrganizationalPosition` (jabatan/posisi)
- `OrganizationalAssignment` (user ↔ posisi, bisa scoped kelas/unit)
- `OrganizationalCapability` (posisi ↔ permission/capability)

Referensi:
- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma)
- [organizational-authorization.engine.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/organizational-authorization.engine.ts)
- Default position capability mapping: [capabilities.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/capabilities.ts)

