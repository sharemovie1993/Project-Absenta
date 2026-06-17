## Audit Menu Scope (Tenant Menu vs Superadmin Menu)

Tanggal: 2026-03-16

Tujuan audit ini adalah memetakan kondisi menu saat ini untuk memastikan apakah menu sudah memisahkan:
- Tenant Application Menu (ADMIN / GURU / SISWA)
- Platform Console Menu (SUPERADMIN)

Dokumen ini hanya audit & dokumentasi (tanpa perubahan kode tambahan).

---

## 1) Audit Menu Table

Model `Menu` saat ini memiliki field:
- `path`, `required_capability`, `required_features`, `requires_petugas_active`
- Tidak ada field scope/context khusus platform.

Referensi model:
- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1668-L1684)

Snapshot hasil seed (is_active=true):
- Total menu: 40
- Root level (parent_id=null): 5
  - Dashboard (`/dashboard`) → `dashboard.view.overview` (features: CORE)
  - Layanan (`/menu/services`) → parent/group (features: CORE)
  - Langganan Saya (`/billing/my-subscription`) → `billing.my_subscription.view` (features: CORE)
  - Notifications (`/menu/notifications`) → parent/group (features: CORE)
  - Settings (`/settings`) → `core.sekolah.view.profile` (features: CORE)

Catatan penting dari data:
- Banyak leaf menu tidak memiliki `required_features` (null), termasuk leaf yang berada di bawah parent yang punya `required_features` (contoh parent `Absensi` features=ABSENSI, namun child leaf sering null). Ini berpengaruh pada hasil sidebar runtime (lihat bagian 5).

Seeder menu canonical:
- [seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts)
- Dokumen menu canonical: [SIDEBAR_MENU_CANONICAL.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/architecture/SIDEBAR_MENU_CANONICAL.md)

---

## 2) Audit Sidebar Rendering Service

Implementasi sidebar yang dipakai endpoint `/api/menu/sidebar`:
- Service: [sidebar-rendering.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/sidebar-rendering.service.ts)
- Controller endpoint: [menu.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/controllers/menu.controller.ts#L36-L83)

Ringkasan logika visibility:
- Filter `required_features`: semua feature yang diminta menu harus ada di `tenantFeatures`.
- Filter `requires_petugas_active`: hanya enforced untuk role yang mengandung `SISWA` (non-SISWA dianggap petugasActive=true).
- Filter `required_capability`:
  - SUPERADMIN: bypass (selalu visible jika lolos feature & petugasActive)
  - Non-SUPERADMIN: harus ada di set capability user.
- Parent pruning:
  - Parent/group didefinisikan sebagai menu dengan `required_capability` kosong.
  - Parent/group dihapus dari output jika tidak punya child visible.

Implikasi scope:
- Service selalu memerlukan tenant context untuk `tenantFeatures` (filter features).
- Service memiliki kondisi khusus SUPERADMIN (bypass capability), tetapi tidak memiliki pemisahan menu platform vs tenant.

---

## 3) Audit SUPERADMIN Module

Tidak ditemukan endpoint menu khusus SUPERADMIN (seperti `/api/superadmin/menu` atau `/api/platform/menu`).

SUPERADMIN menggunakan endpoint yang sama:
- `GET /api/menu/sidebar`

Referensi route:
- [menu.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/routes/menu.routes.ts#L1-L19)

Modul `src/modules/superadmin` berisi endpoint console/platform (infra monitoring, tenant detail, dll), tetapi tidak memiliki builder/seed menu khusus platform.

---

## 4) Audit Menu Scope (Schema)

Kesimpulan schema:
- Tabel `Menu` tidak memiliki field pemisah scope (mis. `scope`, `context`, `is_platform_menu`, `tenant_only`).
- Artinya menu saat ini secara desain adalah satu tabel untuk semua role dan pemisahan dilakukan hanya lewat `required_capability`, `required_features`, dan pruning.

---

## 5) SUPERADMIN Sidebar Test (Runtime)

Test dilakukan dengan login role SUPERADMIN dan memanggil:
- `GET /api/menu/sidebar`

Hasil observasi:
- SUPERADMIN menerima sidebar dari tabel `Menu` yang sama (tenant menu).
- Karena SUPERADMIN bypass check `required_capability`, semua leaf yang tidak dibatasi feature akan visible.
- Feature filtering tetap berlaku, namun karena banyak leaf child tidak punya `required_features`, leaf tersebut lolos filter walaupun parent-nya dibatasi feature. Efeknya: child bisa “naik” menjadi root karena parent tersaring.

Indikasi ini terlihat dari output root yang berisi campuran parent + leaf (contoh `Scan`, `Rekap Harian`, `Anggota`, dll muncul sebagai root).

Referensi logika:
- SUPERADMIN bypass capability: [sidebar-rendering.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/sidebar-rendering.service.ts#L50-L69)

---

## 6) SUPERADMIN Capability Interaction Check

Di level sidebar:
- SUPERADMIN secara default bisa melihat menu yang punya `required_capability` apapun (bypass), selama:
  - feature requirement menu terpenuhi
  - dan jika menu membutuhkan petugasActive untuk SISWA, maka role SUPERADMIN tidak terkena rule SISWA.

Artinya:
- Tidak ada pemisahan “platform console menu” vs “tenant app menu” pada sidebar; SUPERADMIN akan menerima menu tenant yang sama.

---

## 7) Kesimpulan Audit

Jawaban expected result:
1. Menu table saat ini berisi menu tenant application (Dashboard/Layanan/Data Master/Akademik/Absensi/Koperasi/Notifications/Settings), bukan menu platform console khusus.
2. SUPERADMIN tidak punya menu platform khusus dari tabel `Menu`; SUPERADMIN memakai sidebar yang sama (`/api/menu/sidebar`).
3. Sidebar engine tidak memisahkan tenant vs platform; hanya memfilter berdasarkan feature/capability/petugasActive dan pruning.
4. SUPERADMIN saat ini melihat menu tenant (dan karena bypass capability, visibility lebih luas), dengan catatan ada anomali akibat `required_features` yang tidak ter-propagate ke leaf child.

