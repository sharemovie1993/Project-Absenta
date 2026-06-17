Instruksi – Post Refactor Verification & Authorization Cleanup

Platform Absenta telah menyelesaikan implementasi Organizational Authorization Engine.

Tahap ini bertujuan memastikan bahwa:

* tidak ada legacy model authorization yang tersisa
* organizational scope diterapkan secara konsisten di seluruh repository
* authorization system siap untuk skala besar
* tidak ada potensi data leakage

Tahap ini berisi verifikasi sistem dan cleanup implementasi.

---

# STEP 1 – Legacy Model Cleanup

Pastikan model lama berikut tidak lagi digunakan dalam runtime code:

StrukturOrganisasi
GuruStrukturOrganisasi
SiswaStrukturOrganisasi
StrukturPermission

Langkah verifikasi:

1. Scan seluruh codebase backend.
2. Pastikan tidak ada query runtime yang mengakses tabel tersebut.
3. Jika masih ada referensi:

   * ganti dengan model baru OrganizationalPosition / OrganizationalAssignment / OrganizationalCapability.

Legacy model boleh tetap ada sementara untuk migrasi, tetapi tidak boleh dipakai oleh logic runtime.

---

# STEP 2 – Repository Scope Enforcement

Tujuan langkah ini adalah memastikan semua query data tenant mengikuti organizational scope.

Buat helper baru:

src/infra/repository/apply-organizational-scope.ts

Fungsi:

applyOrganizationalScope(queryBuilder, scope)

Parameter:

queryBuilder
scope.kelas_ids
scope.unit_ids
scope.tenant_wide

Implementasi:

1. Jika tenant_wide = true → tidak perlu filter tambahan.
2. Jika kelas_ids ada → tambahkan filter WHERE kelas_id IN scope.kelas_ids.
3. Jika unit_ids ada → tambahkan filter WHERE unit_id IN scope.unit_ids.

---

# STEP 3 – Update Repository Queries

Audit semua repository yang mengakses data tenant.

Minimal domain berikut harus menggunakan scope enforcement:

academic.students
academic.teachers
attendance.sessions
attendance.recap
cooperative.members
cooperative.transactions

Setiap query harus menggunakan:

applyOrganizationalScope()

Pastikan tidak ada query yang mengembalikan data tenant secara penuh tanpa scope check.

---

# STEP 4 – Capability Group Definition

Untuk mencegah capability explosion, buat capability group configuration.

File baru:

src/config/capability-groups.ts

Contoh group:

ATTENDANCE_OPERATOR
ACADEMIC_MANAGER
COOPERATIVE_MANAGER

Setiap group berisi daftar capability dari Action Catalog.

Contoh:

ATTENDANCE_OPERATOR:

attendance.sessions.create
attendance.sessions.update.attendance
attendance.recap.view.daily

Group ini dapat digunakan untuk assignment capability pada organizational position.

---

# STEP 5 – Organizational Context Cache

Buat cache untuk organizational context user.

File:

src/modules/auth/services/organizational-context-cache.ts

Cache key:

org_context:user:{userId}

Cache value:

positions
kelas_ids
unit_ids
tenant_wide

Gunakan Redis.

TTL:

300 seconds

---

# STEP 6 – Integrasi Cache ke Engine

Modifikasi:

OrganizationalAuthorizationEngine.resolveOrganizationalContext()

Langkah implementasi:

1. Cek cache Redis terlebih dahulu.
2. Jika ada cache → return cached context.
3. Jika tidak ada → query database lalu simpan ke cache.

---

# STEP 7 – Cache Invalidation

Cache harus dihapus ketika terjadi perubahan berikut:

organizational assignment create
organizational assignment delete
organizational position update

Tambahkan cache invalidation pada service:

organizational.service.ts

---

# STEP 8 – Authorization Performance Test

Buat test sederhana untuk memastikan authorization tidak menjadi bottleneck.

Simulasi:

100 concurrent requests

Endpoint:

GET /academic/siswa
GET /attendance/sessions

Verifikasi:

* response < 200ms
* tidak ada query organizational assignment berulang

---

# STEP 9 – Security Verification

Lakukan pengujian berikut.

Case 1
Guru biasa tidak dapat melihat siswa di kelas lain.

Case 2
Wali kelas hanya melihat siswa di kelas binaannya.

Case 3
Petugas kelas hanya dapat mengelola absensi kelasnya.

Case 4
Admin tenant dapat melihat seluruh data sekolah.

Jika salah satu test gagal, laporkan endpoint yang bermasalah.

---

# STEP 10 – Final Authorization Pipeline Check

Pastikan pipeline protected API menjadi:

Auth
TenantResolver
SubscriptionGuard
ServiceFeatureGuard
CapabilityGuard
OrganizationalScopeMiddleware
Controller

Tidak boleh ada guard lain yang melakukan authorization di luar pipeline ini.

---

# Output

Simpan laporan verifikasi pada:

docs/architecture/AUTHORIZATION_POST_REFACTOR_VERIFICATION.md

Dokumen harus berisi:

* hasil legacy cleanup
* hasil repository scope audit
* hasil performance test
* hasil security test
* daftar perubahan yang dilakukan
