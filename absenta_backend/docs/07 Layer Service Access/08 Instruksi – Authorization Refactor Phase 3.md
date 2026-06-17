Instruksi – Authorization Refactor Phase 3
Capability Enforcement Normalization

Platform Absenta telah menyelesaikan dua fase refactor authorization:

Phase 1 – Service Feature Guard
Phase 2 – Subscription Guard Hardening

Platform sekarang sudah memiliki:

* tenant governance
* subscription governance
* service governance

Phase 3 bertujuan menormalkan capability enforcement di seluruh endpoint backend agar authorization menjadi konsisten dan dapat diaudit.

Tahap ini tidak boleh mengubah API contract existing.

---

# Tujuan Phase 3

1. Memastikan semua endpoint non-publik memiliki capability mapping.
2. Menghapus role-based authorization yang tidak sesuai blueprint.
3. Menyelaraskan capability enforcement dengan Action Catalog canonical.
4. Menstandarkan penggunaan `requireCapability(...)`.

---

# Task 1 – Endpoint Capability Mapping

Gunakan hasil audit sebelumnya untuk mengidentifikasi endpoint yang belum memiliki capability guard.

Tambahkan capability enforcement pada endpoint tersebut menggunakan:

requireCapability('domain.resource.action')

Contoh:

GET /api/attendance/sessions
→ requireCapability('attendance.sessions.view.list')

POST /api/attendance/sessions
→ requireCapability('attendance.sessions.create')

---

# Task 2 – Role-Based Authorization Migration

Temukan endpoint yang masih menggunakan:

authorize(role)

atau

RoleGuard

Endpoint tersebut harus dimigrasi menjadi capability-based authorization.

Contoh:

Role-based:

authorize('ADMIN')

Diganti dengan:

requireCapability('system.admin.access')

---

# Task 3 – Capability Validation Against Catalog

Semua capability yang digunakan harus berasal dari:

Action Catalog canonical

Lokasi:

docs/action_catalog_canonical_futureproof.md

Jika ditemukan capability yang tidak ada di catalog:

* perbaiki mapping
  atau
* tambahkan capability tersebut secara resmi ke catalog

Tidak boleh ada capability yang digunakan tanpa referensi catalog.

---

# Task 4 – Standardize Guard Usage

Standarkan penggunaan capability enforcement di seluruh route.

Format yang direkomendasikan:

routeOptions.config.capability = 'domain.resource.action'

atau

requireCapability('domain.resource.action')

Pastikan tidak ada endpoint yang menggunakan metode authorization lain selain capability guard.

---

# Task 5 – Capability Logging

Tambahkan logging untuk event authorization failure.

Event name:

CAPABILITY_ACCESS_DENIED

Log harus mencatat:

tenantId
userId
capability
endpoint
timestamp

Tujuannya untuk observability dan audit security.

---

# Task 6 – Verification

Setelah implementasi selesai lakukan pengujian berikut:

Case 1
User tanpa capability mencoba akses endpoint.

Expected result:

HTTP 403
CAPABILITY_ACCESS_DENIED

Case 2
User dengan capability yang benar mencoba endpoint.

Expected result:

SUCCESS

Case 3
User ADMIN dengan capability lengkap mencoba endpoint admin.

Expected result:

SUCCESS

---

# Task 7 – Coverage Validation

Lakukan scan seluruh endpoint backend untuk memastikan:

100% endpoint non-publik memiliki capability guard.

Gunakan script atau tooling untuk menghitung coverage.

Output contoh:

Total endpoint: 360
Endpoint dengan capability guard: 360
Coverage: 100%

---

# Refactor Safety Rules

Selama Phase 3 berlangsung:

* Tidak boleh mengubah endpoint path.
* Tidak boleh mengubah response structure endpoint.
* Tidak boleh memecah module atau route.
* Tidak boleh mengubah ServiceFeatureGuard dan SubscriptionGuard.

Perubahan hanya pada enforcement capability layer.

---

# Output

Simpan laporan implementasi pada:

docs/architecture/AUTHORIZATION_PHASE3_IMPLEMENTATION.md

Laporan harus berisi:

* daftar endpoint yang diperbarui
* endpoint yang dimigrasi dari role-based ke capability-based
* capability yang ditambahkan atau diperbaiki
* coverage capability enforcement

Setelah Phase 3 selesai, platform Absenta akan memiliki authorization model yang konsisten di seluruh endpoint.
