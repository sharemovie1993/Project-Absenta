Instruksi – Organizational Capability Cleanup & Seed Refactor

Tujuan refactor ini adalah menghilangkan redundansi capability dan memastikan seed sistem deterministik.

Refactor mencakup:

* src/config/capabilities.ts
* prisma/seed_policies.ts
* prisma/seed.ts

Tidak boleh mengubah API contract.

---

# STEP 1 – Refactor STRUKTUR_CAPABILITIES

File:

src/config/capabilities.ts

Tujuan:

menghapus capability yang redundant dengan role baseline.

Aturan:

Organizational capability hanya berisi capability tambahan yang spesifik jabatan.

Tidak boleh mengandung capability baseline seperti:

dashboard.view.overview
notify.view.my
notify.update.preferences

Contoh perbaikan:

WALIKELAS hanya boleh memiliki:

attendance.sessions.create
attendance.sessions.close
attendance.officers.manage
attendance.recap.view.daily
attendance.recap.view.monthly
academic.students.view.list
academic.structures.view.detail

PETUGAS_KELAS hanya boleh memiliki:

attendance.sessions.update.attendance
attendance.gate.tap.entry
attendance.recap.view.daily

KURIKULUM hanya boleh memiliki:

academic.activities.view.grouped
academic.teaching.rekap
curriculum.supervision.create.record
curriculum.supervision.update.record
curriculum.supervision.view.schedule
curriculum.supervision.view.report

KESISWAAN hanya boleh memiliki:

affairs.violations.report
affairs.violations.update
affairs.violations.view.list
affairs.violation_types.create
affairs.violation_types.update
affairs.violation_types.delete

KEPALA_SEKOLAH hanya boleh memiliki:

dashboard.view.student_stats
dashboard.view.teacher_attendance
dashboard.view.violation_stats
dashboard.view.financial_summary
attendance.reports.view

Capability umum seperti:

academic.years.view.list
academic.semesters.view.list
documents.view.list

harus dihapus dari posisi organisasi.

---

# STEP 2 – Normalize Capability List

Tambahkan helper di seed_policies.ts untuk menghindari duplikasi capability.

Gunakan:

uniqueStrings()

sebelum menulis ke database.

---

# STEP 3 – Remove Duplicate seedPolicies Call

File:

prisma/seed.ts

Saat ini seedPolicies dipanggil dua kali.

Pertahankan hanya satu pemanggilan:

SETELAH

* role dibuat
* organizationalPosition dibuat

Contoh urutan yang benar:

create tenant
create roles
create organizationalPosition
run seedPolicies()

Hapus pemanggilan kedua seedPolicies.

---

# STEP 4 – Canonical OrganizationalPosition Definition

File:

prisma/seed.ts

Gabungkan:

STRUKTUR_DASAR
STRUKTUR_DEFS

menjadi satu definisi saja:

ORGANIZATIONAL_POSITIONS

Contoh:

KEPALA_SEKOLAH
TU
KAPROG
GERBANG
PETUGAS_KELAS
KURIKULUM
KESISWAAN
HUBIN
SARPRAS
WALIKELAS
GURU_BIASA

Seeder harus menggunakan definisi ini di seluruh tenant.

---

# STEP 5 – Validation Guard

Tambahkan validasi sebelum menulis OrganizationalCapability.

Jika capability tidak ditemukan di Permission table maka:

throw error

Ini untuk mencegah typo capability.

---

# STEP 6 – Verify Seed Determinism

Jalankan:

npm run prisma:seed

Pastikan:

Permission count stabil
RolePermission stabil
OrganizationalCapability stabil

Seed tidak boleh menghasilkan duplikasi record.

---

# STEP 7 – Post Refactor Verification

Periksa tabel:

Permission
RolePermission
OrganizationalPosition
OrganizationalCapability

Pastikan:

tidak ada capability legacy
tidak ada duplicate capability
organizational capability hanya tambahan dari role baseline

---

# Expected Result

Authorization model menjadi:

User
→ Role baseline capability
→ OrganizationalPosition capability
→ Final capability set

Seed menjadi deterministik dan bebas redundansi.
