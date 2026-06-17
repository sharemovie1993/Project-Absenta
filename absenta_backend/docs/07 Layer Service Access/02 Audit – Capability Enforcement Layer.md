Instruksi Audit – Capability Enforcement Layer

Platform Absenta menggunakan sistem authorization berbasis capability (action permissions) yang berasal dari Action Catalog.

Contoh capability:

attendance.sessions.create
academic.students.view.list
billing.invoices.view.list
dashboard.view.overview

Capability digunakan sebagai dasar untuk menentukan apakah user boleh melakukan suatu aksi pada endpoint backend.

Audit tahap sebelumnya telah memeriksa Service Access Layer.

Tahap audit ini berfokus pada **Capability Enforcement** untuk memastikan setiap endpoint backend memiliki pengecekan capability yang benar.

Tidak boleh ada refactor pada tahap ini.

Hanya audit dan laporan.

---

TUJUAN AUDIT

Audit ini harus menjawab pertanyaan berikut:

1. Apakah setiap endpoint backend memiliki capability check
2. Capability apa yang digunakan oleh setiap endpoint
3. Apakah capability guard digunakan secara konsisten
4. Apakah ada endpoint yang hanya menggunakan RBAC role
5. Apakah ada endpoint yang tidak memiliki authorization sama sekali
6. Apakah capability yang digunakan sesuai dengan Action Catalog

---

LANGKAH 1 – Route Inventory

Scan seluruh route backend.

Lokasi:

modules/*/routes
modules/*/controllers

Buat daftar seluruh endpoint API.

Format inventaris endpoint:

METHOD
PATH
MODULE

Contoh:

GET /academic/siswa → module academic
POST /attendance/session → module attendance
GET /billing/invoices → module billing

Semua endpoint harus dicatat.

---

LANGKAH 2 – Capability Mapping

Untuk setiap endpoint identifikasi capability yang digunakan.

Cari penggunaan guard seperti:

CapabilityGuard
authorize()
requireCapability
routeOptions.config.capability

Catat capability yang digunakan oleh endpoint.

Contoh:

POST /attendance/session
→ capability: attendance.sessions.create

GET /academic/siswa
→ capability: academic.students.view.list

Jika endpoint tidak memiliki capability, tandai sebagai:

NO CAPABILITY GUARD

---

LANGKAH 3 – Role Based Authorization Check

Cari endpoint yang hanya menggunakan role check seperti:

if user.role === 'ADMIN'
if role === 'GURU'

atau guard seperti:

RequireRole
RoleGuard

Jika ditemukan, tandai endpoint sebagai:

ROLE BASED AUTHORIZATION

Endpoint seperti ini harus dicatat karena tidak mengikuti capability system.

---

LANGKAH 4 – Endpoint Tanpa Authorization

Cari endpoint yang tidak memiliki:

AuthMiddleware
CapabilityGuard
AuthorizeGuard
RoleGuard

Jika endpoint dapat diakses tanpa authorization dan bukan endpoint publik resmi, tandai sebagai:

UNPROTECTED ENDPOINT

Contoh endpoint publik yang diperbolehkan:

payment webhook
invoice public view (token based)
document download (token based)

Selain itu harus dianggap sebagai potensi vulnerability.

---

LANGKAH 5 – Capability Consistency Check

Bandingkan capability yang ditemukan di endpoint dengan Action Catalog.

Lokasi Action Catalog:

docs/action_catalog_canonical_futureproof.md

Periksa apakah capability yang digunakan:

* terdaftar di action catalog
* memiliki format yang benar
* tidak menggunakan capability legacy

Jika ditemukan capability yang tidak ada di catalog, tandai sebagai:

INVALID CAPABILITY

---

LANGKAH 6 – Module Capability Pattern

Untuk setiap module backend identifikasi pola authorization.

Contoh module:

attendance
academic
billing
cooperative
reporting
kesiswaan
kurikulum
documents

Audit harus menjelaskan apakah module menggunakan:

module level capability guard
route level capability guard
RBAC role check
tidak ada authorization

---

OUTPUT LAPORAN

Hasil audit harus disimpan dalam dokumen:

docs/audit/02_capability_enforcement_audit.md

Dokumen harus berisi:

1. Endpoint inventory
2. Endpoint capability mapping
3. Endpoint tanpa capability guard
4. Endpoint dengan role based authorization
5. Endpoint tanpa authorization
6. Capability yang tidak valid
7. Konsistensi capability per module

---

TUJUAN AKHIR AUDIT

Audit ini akan menghasilkan peta lengkap capability enforcement pada backend Absenta.

Setelah laporan selesai, tahap berikutnya adalah:

Authorization Architecture Normalization

yang akan mencakup:

Service Feature Guard Layer
Subscription Guard Hardening
Capability Enforcement Standardization
RBAC Simplification
