Instruksi – Action Catalog Audit & Cleanup Preparation

Platform Absenta menggunakan Action Catalog sebagai sumber kebenaran untuk seluruh capability authorization.

Saat ini Action Catalog telah berkembang dan mengandung beberapa pola legacy seperti:

* capability dengan pola `manage_*`
* capability dengan pola `view_*`
* capability duplikat (snake_case vs dot format)
* capability yang tidak lagi digunakan oleh sistem

Tujuan instruksi ini adalah melakukan audit menyeluruh terhadap Action Catalog untuk menghasilkan katalog capability canonical yang bersih dan konsisten.

Tahap ini hanya melakukan audit dan dokumentasi.

Tidak boleh menghapus capability dari sistem pada tahap ini.

---

# STEP 1 – Extract Full Action Catalog

Ambil seluruh capability dari sumber berikut:

* action_catalog_canonical_futureproof.md
* seed_policies.ts
* capabilities.ts
* permission table di database

Gabungkan semua capability menjadi satu daftar unik.

Output:

Daftar capability lengkap platform.

---

# STEP 2 – Detect Legacy Capability Patterns

Identifikasi capability yang menggunakan pola legacy berikut.

Pattern A:

manage_*

Contoh:

academic.manage_siswa
academic.manage_mapel
attendance.manage_session

Pattern B:

view_*

Contoh:

academic.view_siswa
academic.view_kelas

Pattern C:

snake_case capability

Contoh:

dashboard.view_overview
notify.view_stats

Tandai capability tersebut sebagai:

LEGACY_CAPABILITY

---

# STEP 3 – Detect Duplicate Capability

Cari capability yang memiliki arti sama tetapi berbeda format.

Contoh:

dashboard.view.overview
dashboard.view_overview

notify.view.stats
notify.view_stats

Kelompokkan capability duplikat tersebut.

Tandai canonical candidate.

---

# STEP 4 – Detect Unused Capability

Scan seluruh codebase backend.

Cari penggunaan capability pada:

requireCapability(...)
authorize(...)
route config capability
menu.required_capability

Capability yang tidak pernah digunakan harus ditandai sebagai:

UNUSED_CAPABILITY

---

# STEP 5 – Detect Aggregated Capability

Capability yang mengandung operasi luas seperti:

manage_*

harus dianalisis.

Contoh:

academic.manage_siswa

harus dipetakan ke capability granular:

academic.students.create
academic.students.update
academic.students.delete
academic.students.view.list

Tandai capability tersebut sebagai:

AGGREGATED_CAPABILITY

---

# STEP 6 – Canonical Naming Validation

Validasi semua capability terhadap format canonical.

Format yang diharapkan:

domain.resource.action

Contoh benar:

academic.students.view.list
attendance.sessions.create
cooperative.members.update

Capability yang tidak mengikuti format tersebut harus ditandai sebagai:

INVALID_FORMAT

---

# STEP 7 – Domain Consistency Check

Pastikan setiap capability berada dalam domain yang benar.

Contoh:

academic.students.view.list → domain academic
attendance.sessions.create → domain attendance

Capability yang domainnya tidak konsisten harus ditandai.

---

# STEP 8 – Generate Canonical Catalog Proposal

Berdasarkan hasil audit:

buat proposal Action Catalog canonical.

Struktur:

domain
resource
action

Contoh:

academic.students.create
academic.students.update
academic.students.delete
academic.students.view.list
academic.students.view.detail

---

# STEP 9 – Generate Mapping Legacy → Canonical

Buat mapping capability lama ke capability baru.

Contoh:

academic.manage_siswa → academic.students.*

dashboard.view_overview → dashboard.view.overview

notify.view_stats → notify.view.stats

---

# STEP 10 – Produce Audit Report

Simpan hasil audit dalam dokumen berikut.

docs/architecture/ACTION_CATALOG_AUDIT.md

Dokumen harus berisi:

1. daftar capability lengkap
2. capability legacy
3. capability duplikat
4. capability tidak digunakan
5. capability aggregated
6. capability invalid format
7. proposal canonical catalog
8. mapping legacy → canonical

---

# Output

Dokumen ini akan menjadi dasar untuk tahap berikutnya:

Action Catalog Cleanup Migration

yang akan menghapus capability legacy dan mengganti dengan canonical capability.
