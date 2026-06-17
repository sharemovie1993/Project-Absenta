## Sidebar Authorization Audit

Tanggal: 2026-03-16

Audit ini memverifikasi sidebar menu (database-driven) agar konsisten dengan capability system (Action Catalog) dan Organizational Authorization Engine.

Catatan:
- Audit dilakukan berbasis definisi seed menu (canonical) dan logic runtime backend/frontend yang tersedia di repository. Tanpa akses DB live, “daftar menu” diekstrak dari definisi seed yang menjadi sumber data Menu di database.

---

## 1) Model Database Sidebar

Sidebar disimpan pada tabel `Menu` dan relasi `MenuRole`.

Referensi schema:
- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1760-L1791)

### Menu

Field penting:
- `id` (uuid)
- `parent_id` (self relation)
- `name`
- `path` (nullable; beberapa node adalah “group/header”)
- `icon`
- `order`
- `required_capability` (string, berisi Action ID/capability)
- `required_features` (json array; gating subscription di frontend)
- `requires_petugas_active` (flag gating khusus SISWA)
- `is_active`

### MenuRole

Field penting:
- `menu_id`, `role_id`
- `can_view` (dipakai sebagai fallback jika menu tidak memiliki `required_capability`)

---

## 2) Ekstrak Seluruh Menu Sidebar

Sumber ekstraksi:
- Seed canonical: [prisma/seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts#L256-L445)

Tabel berikut adalah daftar menu dari `NAV_ITEMS` (yang di-seed ke DB).

Kolom:
- Parent: nama menu parent (jika ada)
- Capability: `required_capability` (Action ID)
- Flags: `requires_petugas_active`, `required_features`

| Menu Name | Path | Parent | Capability | Flags |
|---|---|---|---|---|
| Dashboard | /dashboard |  | dashboard.view.overview | required_features=CORE |
| Layanan | /services |  | (null) | required_features=CORE |
| Data Master | /menu/data-master |  | academic.structures.view.list | required_features=CORE |
| Jurusan | /academic/jurusan | Data Master | academic.structures.view.list |  |
| Kelas | /academic/kelas | Data Master | academic.structures.view.list |  |
| Mata Pelajaran | /academic/mapel | Data Master | academic.activities.view.list |  |
| Guru | /academic/guru | Data Master | academic.teachers.view.list |  |
| Siswa | /academic/siswa | Data Master | academic.students.view.list |  |
| Cetak Kartu Siswa | /academic/siswa-cards | Data Master | academic.student_card.view.config |  |
| Struktur Organisasi | /academic/struktur-organisasi | Data Master | academic.structure.manage |  |
| Wali Kelas | /academic/wali-kelas | Data Master | academic.homeroom.manage |  |
| Users | /users | Data Master | core.users.view.list |  |
| Akademik | /menu/akademik |  | academic.years.view.list | required_features=CORE |
| Tahun Pelajaran | /academic/tahun-pelajaran | Akademik | academic.years.view.list |  |
| Semester | /academic/semester | Akademik | academic.semesters.view.list |  |
| Guru Mapel | /academic/guru-mapel | Akademik | academic.teaching.view |  |
| Mutasi Siswa | /academic/mutation | Akademik | academic.students.view.list |  |
| Data Backup | /academic/backup | Akademik | academic.structure.manage |  |
| Absensi | /menu/attendance |  | attendance.recap.view.daily | required_features=ABSENSI |
| Scan | /attendance/ops | Absensi | attendance.sessions.update.attendance | requires_petugas_active=true |
| Setting Jadwal | /attendance/jadwal-template | Absensi | attendance.schedules.create | requires_petugas_active=true |
| Petugas Kelas | /attendance/petugas | Absensi | attendance.officers.manage |  |
| Pengaturan Absensi | /attendance/settings | Absensi | attendance.gate.bypass |  |
| Rekap Harian | /attendance/rekap/siswa-harian | Absensi | attendance.recap.view.daily |  |
| Rekap Bulanan | /attendance/rekap/siswa-bulanan | Absensi | attendance.recap.view.monthly |  |
| Rekap per Kelas | /attendance/rekap/kelas-bulanan | Absensi | attendance.recap.view.monthly |  |
| Perekaman Wajah | /attendance/rekam-wajah | Absensi | attendance.manage_face_templates |  |
| Koperasi | /menu/cooperative |  | dashboard.view.overview | required_features=KOPERASI |
| Dashboard | /cooperative/dashboard | Koperasi | dashboard.view.overview |  |
| Anggota | /cooperative/members | Koperasi | dashboard.view.overview |  |
| Simpanan | /cooperative/savings | Koperasi | dashboard.view.overview |  |
| Pinjaman | /cooperative/loans | Koperasi | dashboard.view.overview |  |
| Toko (POS) | /cooperative/pos | Koperasi | dashboard.view.overview |  |
| PPOB | /cooperative/ppob | Koperasi | dashboard.view.overview |  |
| Laporan | /cooperative/reports | Koperasi | dashboard.view.overview |  |
| Billing | /menu/billing |  | billing.invoices.view.list | required_features=CORE |
| Dashboard | /billing/dashboard | Billing | dashboard.view.financial_summary |  |
| Plans | /billing/plans | Billing | billing.plans.view.list |  |
| Subscriptions | /billing/subscriptions | Billing | billing.subscriptions.view.active |  |
| Invoices | /billing/invoices | Billing | billing.invoices.view.list |  |
| Approvals | /billing/approvals | Billing | billing.subscriptions.view.list |  |
| Reports | /billing/reports | Billing | billing.reports.view.summary |  |
| Pengaturan | /billing/settings | Billing | core.system.config.view |  |
| Monitoring | /billing/monitoring | Billing | attendance.monitoring.view.live_status |  |
| Tripay Health | /billing/tripay-health | Billing | attendance.monitoring.view.live_status |  |
| Tripay Simulator | /billing/tripay-simulator | Billing | billing.invoices.view.list |  |
| Infrastructure | /superadmin/infra | Billing | superadmin.infra.view.socket_global |  |
| Langganan Saya | /billing/my-subscription |  | billing.my_subscription.view | required_features=CORE |
| Notifications (A) | /menu/notifications |  | notify.check.status | required_features=CORE |
| WhatsApp Health | /notifications/whatsapp-health | Notifications (A) | notify.check.status |  |
| Subscriptions | /notifications/subscriptions | Notifications (A) | notify.push.view.subscriptions |  |
| Intelligence | /menu/intelligence |  | core.tenants.view.list |  |
| Overview | /superadmin/intelligence | Intelligence | core.tenants.view.list |  |
| Revenue Intelligence | /superadmin/intelligence/revenue | Intelligence | core.tenants.view.list |  |
| Upgrade Intelligence | /superadmin/intelligence/upgrade | Intelligence | core.tenants.view.list |  |
| Infra Control Center | /superadmin/infra/jobs | Intelligence | core.tenants.view.list |  |
| Revenue | /superadmin/revenue |  | superadmin.revenue.view.overview |  |
| Tenants | /tenants |  | core.tenants.view.list |  |
| Role Management | /management/roles |  | core.users.view.roles |  |
| Menu Management | /management/menus |  | core.menu.view.list |  |
| Kesiswaan | /menu/kesiswaan |  | affairs.violations.view.list | required_features=ABSENSI |
| Dashboard Kesiswaan | /kesiswaan/dashboard | Kesiswaan | affairs.violations.view.list |  |
| Pelanggaran Siswa | /kesiswaan/pelanggaran | Kesiswaan | affairs.violations.view.list |  |
| Jenis Pelanggaran | /kesiswaan/jenis-pelanggaran | Kesiswaan | affairs.violation_types.view.list |  |
| Kurikulum | /menu/kurikulum |  | curriculum.supervision.view.schedule | required_features=ABSENSI |
| Dashboard Kurikulum | /kurikulum/dashboard | Kurikulum | curriculum.supervision.view.schedule |  |
| Jadwal Supervisi | /kurikulum/supervisi | Kurikulum | curriculum.supervision.view.schedule |  |
| Jenis Pelanggaran (source=kurikulum) | /kesiswaan/jenis-pelanggaran?source=kurikulum | Kurikulum | affairs.violation_types.view.list |  |
| Hubin | /menu/hubin |  | hubin.pkl.view.list | required_features=ABSENSI |
| Dashboard Hubin | /hubin/dashboard | Hubin | hubin.pkl.view.list |  |
| Data Mitra | /hubin/mitra | Hubin | hubin.partners.manage |  |
| PKL / Magang | /hubin/pkl | Hubin | hubin.pkl.view.list |  |
| MoU Kerjasama | /hubin/mou | Hubin | hubin.mou.view.list |  |
| Sarpras | /menu/sarpras |  | sarpras.inventory.view.list | required_features=ABSENSI |
| Dashboard Sarpras | /sarpras/dashboard | Sarpras | sarpras.inventory.view.list |  |
| Inventaris | /sarpras/inventory | Sarpras | sarpras.inventory.view.list |  |
| Peminjaman | /sarpras/loans | Sarpras | sarpras.inventory.manage |  |
| Tata Usaha | /menu/tu |  | tu.letters.manage | required_features=ABSENSI |
| Dashboard TU | /tu/dashboard | Tata Usaha | tu.letters.manage |  |
| Persuratan | /tu/surat | Tata Usaha | tu.letters.manage |  |
| Keuangan | /tu/finance | Tata Usaha | tu.finance.manage |  |
| Data Staff | /tu/staff | Tata Usaha | tu.staff.view.list |  |
| Document Center | /menu/documents |  | documents.view.list | required_features=ABSENSI |
| Semua Dokumen | /documents | Document Center | documents.view.list |  |
| Activity Viewer | /documents/activities | Document Center | documents.view.activities |  |
| Billing Documents | /invoice/list | Document Center | billing.invoices.view.list |  |
| Company Documents | (null) | Document Center | documents.view.list |  |
| Manuals | (null) | Document Center | documents.view.list |  |
| Legal Documents | (null) | Document Center | documents.view.list |  |
| Notifications (B) | /menu/notifications |  | notify.view.stats |  |
| Subscriptions | /notifications/subscriptions | Notifications (B) | notify.push.view.subscriptions |  |
| WhatsApp Health | /notifications/whatsapp-health | Notifications (B) | notify.check.status |  |
| Settings | /settings |  | core.sekolah.view.profile | required_features=CORE |

---

## 3) Validasi Capability Menu vs Action Catalog

Sumber Action Catalog canonical:
- [docs/action_catalog_canonical_futureproof.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/action_catalog_canonical_futureproof.md)

Hasil validasi:
- Semua `required_capability` pada seed menu terdaftar di Action Catalog canonical (tidak ada `INVALID_CAPABILITY`).

---

## 4) Menu Tanpa Capability

Kategori:
- `MISCONFIGURED_MENU`: menu tanpa `required_capability` namun bukan public menu.

Temuan:
- `Layanan` (`/services`) → `required_capability` null. Saat ini akan jatuh ke fallback `MenuRole.can_view`.

---

## 5) Mapping Menu ke Module Service (Backend)

Heuristik mapping:
- Berdasarkan prefix `path` dan/atau prefix capability (domain).

Ringkasan:
- `dashboard.*` → modul dashboard
- `academic.*` → modul academic
- `attendance.*` → modul attendance
- `billing.*` → modul billing
- `cooperative.*` → modul cooperative
- `documents.*` → modul document center
- `notify.*` → modul notification
- `hubin.*`, `sarpras.*`, `tu.*`, `curriculum.*`, `affairs.*` → modul domain terkait
- `core.*`, `superadmin.*` → modul core/superadmin

Catatan mismatch yang perlu ditinjau:
- Menu Koperasi memakai `dashboard.view.overview` untuk hampir semua child menu koperasi (valid di catalog, tapi tidak spesifik modul koperasi).
- Menu `Mata Pelajaran` memakai `academic.activities.view.list` (bukan `academic.subjects.view.list`).

---

## 6) Cross Check Menu vs RBAC Role Baseline

Sumber baseline role capabilities:
- [seed_policies.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed_policies.ts#L89-L177)

Catatan implementasi:
- Backend menu runtime utama adalah capability-based (`required_capability`) via [menu.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/menu.service.ts#L268-L371)
- `MenuRole` hanya fallback bila `required_capability` null.

Ringkasan (high-level):
- `SUPERADMIN`: semua menu aktif visible.
- `ADMIN`: mayoritas menu CORE/ABSENSI/BILLING/KOPERASI visible jika capability ada di baseline.
- `GURU`: dashboard + view akademik terbatas + absensi view + beberapa domain menu (kesiswaan/kurikulum/tu/sarpras/hubin) bergantung capability dari assignment organisasi (lihat poin 7).
- `SISWA`: dashboard + rekap pribadi; menu absensi operasional hanya muncul jika SISWA memperoleh capability via assignment posisi.

---

## 7) Cross Check dengan Organizational Positions

Mekanisme:
- Menu tidak melakukan “check jabatan” langsung, namun mengandalkan capability yang dihitung oleh AuthorizationService.
- Ada satu gating khusus SISWA: `requires_petugas_active`.

Implementasi gating petugas:
- Backend mengecek `OrganizationalAssignment` aktif dengan `Position.code = 'PETUGAS_KELAS'`, hanya untuk SISWA:
  - [menu.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/menu.service.ts#L298-L360)

Front-end gating tambahan:
- Frontend Sidebar memfilter node berdasarkan `required_features` dan status subscription:
  - [Sidebar.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/components/layout/Sidebar.tsx)

Temuan penting:
- `Absensi > Setting Jadwal` menandai `requires_petugas_active=true` dan roles termasuk SISWA, tetapi capability yang dipakai adalah `attendance.schedules.create` (tidak ada di baseline SISWA dan juga tidak termasuk default STRUKTUR_CAPABILITIES untuk `PETUGAS_KELAS`). Secara efektif, menu ini tidak akan muncul untuk SISWA petugas, walau `petugasActive=true`.

---

## 8) Menu Redundansi

Temuan:
- Duplikasi node `Notifications` pada path yang sama (`/menu/notifications`) dengan capability berbeda (`notify.check.status` vs `notify.view.stats`). Karena seed melakukan upsert by `path`, entri kedua akan meng-overwrite entri pertama → rawan inkonsistensi tree.

Rekomendasi:
- Konsolidasikan menjadi satu definisi `Notifications` dan satu sumber capability yang benar (serta child list yang unik).

---

## 9) Hierarchy Validation

Temuan:
- Ada beberapa node dengan `path = null` (contoh: Company Documents/Manuals/Legal Documents). Ini valid sebagai header/group, tetapi:
  - perlu dipastikan frontend tidak menganggapnya clickable.
  - frontend memiliki heuristik `inferPathFromLabel` untuk beberapa label tertentu; berpotensi terjadi “implicit navigation” tanpa capability baru bila label berubah.

Tidak ditemukan indikasi orphan parent dari definisi seed (semua child berada di bawah parent di `NAV_ITEMS`).

---

## 10) Rekomendasi Perbaikan (tanpa eksekusi)

- Tambahkan capability baru untuk menu `Layanan` (contoh: `core.services.view.list`) agar tidak ada menu tanpa capability, lalu seed ulang menu.
- Perbaiki capability menu Koperasi dari `dashboard.view.overview` menjadi capability koperasi yang spesifik (contoh: `cooperative.dashboard.view.overview`, `cooperative.members.view.list`, `cooperative.store.orders.view.list`, dll).
- Perbaiki `Mata Pelajaran` agar memakai `academic.subjects.view.list` (bukan `academic.activities.view.list`).
- Putuskan kebijakan untuk `Absensi > Setting Jadwal` pada role SISWA:
  - jika memang boleh untuk petugas: tambahkan `attendance.schedules.create` ke capability posisi `PETUGAS_KELAS`
  - jika tidak: hapus SISWA dari roles/visibility seed menu untuk item tersebut
- Konsolidasikan duplikasi `Notifications` (path sama) agar seed deterministik dan tree stabil.

