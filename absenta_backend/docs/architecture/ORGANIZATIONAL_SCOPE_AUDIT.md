## Organizational Structure Authorization Audit

Tanggal: 2026-03-16

Audit ini mendokumentasikan bagaimana “Struktur Organisasi” (jabatan/penugasan) terhubung dengan sistem authorization Absenta, tanpa melakukan perubahan kode.

---

## 1) Model Data Struktur Organisasi

Sumber skema: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1019-L1083)

### StrukturOrganisasi

Model: `StrukturOrganisasi`
- `id`: primary key
- `tenant_id`: tenant pemilik struktur
- `kode`: kode jabatan (contoh: `KEPALA_SEKOLAH`, `WALIKELAS`, `PETUGAS_KELAS`)
- `nama`: nama tampilan
- `scope`: kategori (attendance | academic | student | admin | facility)
- `kelas_id`: optional (struktur bisa spesifik kelas, misal PETUGAS_KELAS/WALIKELAS)
- `is_active`: status aktif

Uniqueness:
- `@@unique([tenant_id, kode, kelas_id])` → memungkinkan satu kode punya banyak instance per kelas.

### Assignment (Many-to-Many)

Relasi guru:
- `GuruStrukturOrganisasi`: assignment guru ↔ struktur ([schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1065-L1083))
  - fields: `tenant_id`, `guru_id`, `struktur_organisasi_id`, `is_active`, `start_date`, `end_date`
  - uniqueness: `@@unique([guru_id, struktur_organisasi_id])`

Relasi siswa:
- `SiswaStrukturOrganisasi`: assignment siswa ↔ struktur ([schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1042-L1063))
  - fields: `tenant_id`, `siswa_id`, `struktur_organisasi_id`, `kelas_id` (opsional), `is_active`, `start_date`, `end_date`
  - uniqueness: `@@unique([siswa_id, struktur_organisasi_id])`

### Struktur → Permission (Capability)

Relasi permission:
- `StrukturPermission`: mapping struktur ↔ permission id ([schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L263-L286))
  - fields: `struktur_organisasi_id`, `permission_id`, `conditions` (Json opsional)
  - uniqueness: `@@unique([struktur_organisasi_id, permission_id])`

Catatan:
- `conditions` dan `permission.scope_template` saat ini tersimpan namun belum terlihat ada enforcement runtime (lebih banyak dipakai sebagai metadata).

---

## 2) Assignment Jabatan Organisasi

### CRUD Struktur & Assignment Manual (Admin)

Endpoint backend:
- `GET /academic/struktur-organisasi/tree`: `academic.structures.view.tree`
- `GET /academic/struktur-organisasi`: `academic.structures.view.list`
- `POST /academic/struktur-organisasi/:id/guru`: `academic.structures.assign.teacher`
- `POST /academic/struktur-organisasi/:id/siswa`: `academic.structures.assign.student`
- `PUT /academic/struktur-organisasi/:id/permissions`: `academic.structures.update`

Referensi route: [struktur-organisasi.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/struktur-organisasi/routes/struktur-organisasi.routes.ts)

Service pengelola assignment dan permission:
- [struktur-organisasi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/struktur-organisasi/services/struktur-organisasi.service.ts)
  - `assignGuru` / `removeGuru` → mengelola `GuruStrukturOrganisasi`
  - `assignSiswa` / `removeSiswa` → mengelola `SiswaStrukturOrganisasi`
  - `getPermissions` / `updatePermissions` → mengelola `StrukturPermission`

### Assignment Otomatis (Kelas-spesifik)

Petugas Kelas (Siswa):
- `PetugasService.ensurePetugasStruktur` membuat `StrukturOrganisasi(kode=PETUGAS_KELAS, kelas_id=...)` bila belum ada, lalu assign `SiswaStrukturOrganisasi`.
- Referensi: [petugas.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/petugas/services/petugas.service.ts#L9-L40)

Wali Kelas (Guru):
- `WaliKelasService.ensureWaliKelasStrukturId` membuat `StrukturOrganisasi(kode=WALIKELAS, kelas_id=...)` bila belum ada, lalu assignment lewat `GuruStrukturOrganisasi`.
- Referensi: [wali-kelas.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/wali-kelas/services/wali-kelas.service.ts#L81-L101)

### Seed Default Struktur

Seed struktur dasar (tenant system) didefinisikan sebagai `DEFAULT_STRUKTUR_ORGANISASI`:
- [organization-structure.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/organization-structure.ts)
- dipakai saat seeding: [seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts)

---

## 3) Integrasi Struktur → Capability (Authorization)

### Mapping Jabatan → Capability

Mapping baseline jabatan ke action-id ada di `STRUKTUR_CAPABILITIES`:
- [capabilities.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/capabilities.ts)

### Seeding StrukturPermission

Saat seed policy engine dijalankan, sistem akan:
- seed `Permission` dari Action Catalog canonical
- seed `RolePermission` baseline per role
- seed `StrukturPermission` untuk semua `StrukturOrganisasi` yang ada, berdasarkan `STRUKTUR_CAPABILITIES`

Referensi: [seed_policies.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed_policies.ts#L362-L391)

### Runtime: Resolusi Capability User

AuthorizationService menggabungkan capability dari:
- Role permissions (RBAC): `Role.rolePermissions.Permission.id`
- Struktur permissions (Organizational): untuk semua assignment struktur aktif guru/siswa → `StrukturOrganisasi.strukturPermissions.Permission.id`

Referensi implementasi: [resolveUserCapabilities](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/authorization.service.ts#L48-L141)

Kesimpulan:
- Struktur organisasi *benar-benar mempengaruhi capability* (bukan hanya UI), karena capability tambahan berasal dari `StrukturPermission` yang dimiliki jabatan/struktur.

---

## 4) Integrasi Struktur → Data Scope (Row/Domain Scope)

### DataScope Middleware (Tenant + Self-scope)

Middleware `determineDataScope()`:
- mengisi `request.dataScope.tenantId`
- untuk `SISWA`, default menambahkan `request.dataScope.userId = user.id` (self-only) kecuali bila siswa terdeteksi sebagai petugas absensi via `SiswaStrukturOrganisasi` scope attendance.

Referensi: [dataScope.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/dataScope.ts#L57-L85)

Catatan:
- DataScope middleware saat ini hanya melakukan “organizational override” untuk kasus SISWA Petugas (attendance).
- Tidak ada general “OrganizationalScopeGuard” yang terpusat untuk semua role/struktur.

### Domain-Specific Scoping (contoh)

Beberapa domain menerapkan scope tambahan berbasis struktur secara spesifik:
- Attendance sesi-absensi: guru biasa dibatasi dengan filter `guruIdFilter` kecuali punya struktur privileged (scope admin/attendance atau kode tertentu).  
  Referensi: [sesi.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts#L180-L210)
- Wali Kelas struktur assignments: guru biasa hanya melihat assignment dirinya kecuali punya struktur privileged (`KURIKULUM`, `KESISWAAN`, `KEPALA_SEKOLAH`, `KAPROG`).  
  Referensi: [resolveGuruIdForStrukturAssignments](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/academic/wali-kelas/services/wali-kelas.service.ts#L103-L128)

Kesimpulan:
- Data scope berbasis struktur ada, tetapi tersebar dan domain-specific (tidak menjadi satu layer/pipeline formal).

---

## 5) Integrasi dengan Authorization Pipeline

Pipeline protected API (ringkas) berada di [router.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/router.ts#L174-L205):

Auth (JWT)
→ Tenant resolver/status + Subscription guard
→ ServiceFeatureGuard (tenant entitlement per modul)
→ CapabilityGuard (ModuleCapability)
→ Route-level `requireCapability(...)`
→ Controller/Service (+ opsional `determineDataScope()`)

Keterkaitan struktur organisasi terhadap pipeline:
- Capability layer: terintegrasi lewat `AuthorizationService.resolveUserCapabilities` (membaca StrukturPermission via assignment aktif).
- Data scope layer: sebagian terintegrasi lewat `determineDataScope()` dan sebagian lewat guard/service domain-specific.

Tidak ditemukan layer khusus bernama “OrganizationalScopeGuard” yang dipasang global.

---

## 6) Integrasi UI (Frontend)

### Manajemen Struktur Organisasi

Frontend menyediakan UI untuk:
- CRUD struktur
- assignment guru/siswa ke struktur
- update permissions struktur

Referensi:
- API wrapper: [strukturOrganisasi.api.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/academic/strukturOrganisasi.api.ts)
- Halaman: [StrukturOrganisasiList.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/pages/academic/struktur-organisasi/StrukturOrganisasiList.tsx)

### UI Gate

Frontend melakukan gate berbasis capability (bukan role):
- Contoh route protection: `requiredCapability="academic.structures.view.tree"`  
  Referensi: [App.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L318-L323)

### Petugas Kelas Check

Frontend memiliki util check status petugas per kelas untuk UI flow attendance:
- Referensi: [attendanceGerbang.api.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/api/attendanceGerbang.api.ts#L363-L369)
- Backend endpoint: `/attendance/sesi-absensi/petugas/check` guarded oleh capability (`attendance.sessions.update.attendance` atau `attendance.reports.view`) + `determineDataScope()`  
  Referensi: [sesi-absensi.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts#L106-L112)

---

## 7) Gap Analysis

### A. Conditions/Scope Template belum di-enforce
- `StrukturPermission.conditions` ada di schema, tetapi belum terlihat ada pemrosesan untuk menerapkan kondisi sebagai row-level filters.
- `Permission.scope_template` juga belum terlihat dipakai untuk enforcement runtime.

### B. Organizational scope belum menjadi layer tunggal
- Untuk SISWA petugas, ada integrasi di `determineDataScope()`.
- Untuk GURU dan jabatan lain, enforcement scope sering terjadi di level service/guard domain-specific (contoh attendance/wali kelas), berpotensi tidak konsisten antar module.

### C. Duplikasi representasi “Wali Kelas”
- Ada model `WaliKelas` (rekap admin domain) dan juga struktur `WALIKELAS` (organisasi + capability tambahan).
- Ini bisa memunculkan dua sumber kebenaran: “jabatan wali kelas” sebagai data (WaliKelas) vs sebagai assignment struktur (GuruStrukturOrganisasi).

### D. Struktur kelas-spesifik
- `PETUGAS_KELAS` dan `WALIKELAS` dapat dibuat per kelas (`kelas_id`).
- Ini kuat untuk scoping, tetapi membutuhkan konsistensi: setiap fitur yang mengandalkan “petugas/wali” perlu mengambil struktur yang tepat (tenant + kode + kelas_id).

### E. Potensi privilege mismatch (UI vs security)
- UI melakukan gate berdasarkan capability, tetapi bila backend service tidak menerapkan filter data yang sesuai (row-scope), user bisa “authorized” namun tetap bisa melihat data terlalu luas.
- Saat ini mitigasi dilakukan secara parsial (SISWA self-scope, dan beberapa domain guard).

