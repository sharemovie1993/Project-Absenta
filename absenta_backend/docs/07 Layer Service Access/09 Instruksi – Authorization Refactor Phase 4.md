Instruksi – Authorization Refactor Phase 4
RBAC Simplification

Platform Absenta telah menyelesaikan:

Phase 1 – Service Feature Guard
Phase 2 – Subscription Guard Hardening
Phase 3 – Capability Enforcement Normalization

Semua endpoint non-publik sekarang sudah menggunakan capability enforcement dan tidak lagi bergantung pada role-based authorization langsung.

Phase 4 bertujuan menyederhanakan implementasi RBAC agar sistem authorization lebih bersih, konsisten, dan mudah dirawat.

Tidak boleh ada perubahan API contract.

---

# Tujuan Phase 4

1. Menghapus logika role-based authorization yang tidak lagi diperlukan.
2. Menyatukan resolusi capability user dalam satu service.
3. Menghapus fallback/hardcoded capability yang tidak diperlukan.
4. Menyederhanakan middleware authorization agar lebih maintainable.

Phase ini bersifat codebase cleanup dan tidak boleh mengubah hasil keputusan authorization.

---

# Task 1 – Centralize Capability Resolution

Semua capability user harus berasal dari satu service:

AuthorizationService

Lokasi contoh:

src/modules/auth/services/authorization.service.ts

Service ini bertanggung jawab untuk:

* mengambil role user
* mengambil capability dari role
* menggabungkan capability tambahan jika ada
* mengembalikan capability final user

Method utama:

resolveUserCapabilities(userId)

Output contoh:

[
"attendance.sessions.view.list",
"attendance.sessions.create",
"academic.students.view.list"
]

Semua guard harus menggunakan service ini sebagai sumber capability.

---

# Task 2 – Remove Legacy Role Guards

Cari implementasi berikut di codebase:

RoleGuard
authorize(role)
if user.role === 'ADMIN'

Jika logika tersebut tidak lagi diperlukan karena sudah digantikan capability guard, maka hapus implementasinya.

Jika masih diperlukan untuk operasi platform khusus, ubah menjadi capability khusus.

Contoh:

system.superadmin.access

---

# Task 3 – Remove Hardcoded Capability Fallback

Pada beberapa bagian sistem mungkin terdapat fallback seperti:

ADMIN → allow all
SUPERADMIN → bypass checks

Evaluasi apakah fallback tersebut masih diperlukan.

Jika diperlukan:

* implementasikan sebagai capability khusus
* atau lakukan bypass melalui capability yang jelas

Contoh capability:

system.platform.full_access

---

# Task 4 – Simplify Authorization Middleware

Periksa middleware authorization yang ada.

Tujuan simplifikasi:

* menghilangkan logic duplikat
* menghilangkan conditional branch yang tidak diperlukan
* memastikan alur authorization lebih mudah dibaca

Pipeline final harus tetap:

Auth Middleware
→ Tenant Resolver
→ Tenant Status Guard
→ Subscription Guard
→ ServiceFeatureGuard
→ CapabilityGuard
→ Controller

Tidak boleh ada guard lain yang melakukan authorization.

---

# Task 5 – Codebase Cleanup

Lakukan pembersihan berikut:

* hapus import guard yang tidak lagi digunakan
* hapus util authorization lama
* hapus helper role-check yang obsolete
* perbarui komentar dan dokumentasi

Pastikan tidak ada dead code yang tersisa.

---

# Task 6 – Verification

Setelah simplifikasi selesai lakukan pengujian:

1. User dengan capability yang benar dapat mengakses endpoint.
2. User tanpa capability mendapat HTTP 403.
3. SUPERADMIN tetap dapat mengakses endpoint yang sesuai kebijakan platform.
4. Tidak ada perubahan behavior endpoint dibanding Phase 3.

---

# Task 7 – Authorization Consistency Check

Lakukan audit singkat untuk memastikan:

* semua endpoint masih memiliki capability guard
* capability resolution hanya berasal dari AuthorizationService
* tidak ada role-based authorization tersisa

---

# Output

Simpan laporan implementasi pada:

docs/architecture/AUTHORIZATION_PHASE4_IMPLEMENTATION.md

Dokumen harus berisi:

* komponen yang disederhanakan
* guard atau util yang dihapus
* perubahan pada AuthorizationService
* hasil verification

---

# Hasil yang Diharapkan

Setelah Phase 4 selesai:

* Authorization codebase menjadi lebih sederhana
* Tidak ada lagi role-based authorization langsung
* Semua keputusan akses berbasis capability
* Arsitektur authorization menjadi lebih mudah dirawat

Refactor Authorization platform Absenta dianggap selesai setelah fase ini.
