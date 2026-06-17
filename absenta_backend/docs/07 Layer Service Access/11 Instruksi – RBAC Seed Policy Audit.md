Instruksi – RBAC Seed Policy Audit & Capability Matrix Generation

Platform Absenta telah menyelesaikan refactor authorization sampai Phase 4.

Authorization model yang aktif sekarang adalah:

ROLE → CAPABILITIES → ENDPOINT

Capability enforcement sudah distandarkan menggunakan requireCapability(...).

Sebelum mendesain RBAC capability matrix final, perlu dilakukan audit terhadap seed policies yang saat ini digunakan oleh sistem.

Tujuan audit ini adalah memetakan capability yang dimiliki oleh setiap role berdasarkan data seed yang ada.

Tahap ini tidak boleh mengubah kode.

Hanya melakukan audit dan menghasilkan dokumentasi RBAC matrix.

---

# Tujuan Audit

Audit ini bertujuan untuk:

* memetakan role bawaan platform
* mengidentifikasi capability yang diberikan oleh seed policies
* membandingkan capability tersebut dengan Action Catalog canonical
* menghasilkan Role → Capability Matrix aktual

---

# Task 1 – Identify Seed Policy Source

Identifikasi file seed yang mendefinisikan role dan capability.

Biasanya berada pada:

seed_policies.ts
seed.ts

atau folder:

src/database/seeds

Dari file tersebut identifikasi:

* daftar role default
* capability yang diberikan pada setiap role

Role yang diharapkan minimal:

SUPERADMIN
ADMIN
GURU
SISWA

---

# Task 2 – Extract Role Capability Mapping

Ekstrak mapping capability untuk setiap role.

Contoh output sementara:

SUPERADMIN:

system.platform.full_access
superadmin.analytics.view
superadmin.tenants.manage
billing.*

ADMIN:

academic.students.view.list
academic.students.update
attendance.sessions.create
attendance.sessions.close
cooperative.transactions.manage

GURU:

attendance.sessions.create
attendance.sessions.view.list
academic.students.view.list
academic.grades.update

SISWA:

attendance.recap.view.self
dashboard.view.self
notify.view.my

Output harus berupa daftar capability untuk setiap role.

---

# Task 3 – Compare With Action Catalog

Bandingkan capability yang ditemukan dengan:

docs/action_catalog_canonical_futureproof.md

Periksa:

* apakah capability terdaftar di catalog
* apakah ada capability yang tidak ada di catalog
* apakah ada capability yang belum digunakan di seed policies

Klasifikasikan hasil menjadi:

VALID CAPABILITY
MISSING FROM CATALOG
UNUSED CAPABILITY

---

# Task 4 – Generate Role Capability Matrix

Buat matrix yang memetakan role terhadap capability.

Format tabel:

Capability | SUPERADMIN | ADMIN | GURU | SISWA

Contoh:

attendance.sessions.create | ✔ | ✔ | ✔ |
attendance.sessions.close | ✔ | ✔ | ✔ |
academic.students.view.list | ✔ | ✔ | ✔ |
academic.students.update | ✔ | ✔ | |
cooperative.transactions.manage | ✔ | ✔ | |
notify.view.my | ✔ | ✔ | ✔ | ✔

Matrix harus mencakup semua capability yang ditemukan di seed policies.

---

# Task 5 – Domain Classification

Kelompokkan capability berdasarkan domain.

Contoh domain:

core
academic
attendance
cooperative
reporting
billing
superadmin
notification

Tujuan klasifikasi ini adalah membantu desain RBAC yang lebih rapi.

---

# Task 6 – Gap Analysis

Identifikasi gap antara:

seed policies
action catalog
authorization system

Contoh gap:

* capability ada di catalog tetapi tidak digunakan
* capability digunakan tetapi tidak ada di catalog
* capability yang mungkin terlalu luas untuk role tertentu

Gap ini hanya dilaporkan, tidak perlu diperbaiki pada tahap ini.

---

# Output

Simpan hasil audit pada:

docs/architecture/RBAC_CAPABILITY_MATRIX.md

Dokumen harus berisi:

1. daftar role default
2. capability per role (berdasarkan seed)
3. role capability matrix
4. domain classification
5. gap analysis

Dokumen ini akan digunakan untuk merancang RBAC policy final platform Absenta.
