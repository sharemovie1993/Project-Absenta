Instruksi Implementasi – Organizational Authorization Engine

Tujuan implementasi ini adalah membangun sistem authorization berbasis struktur organisasi yang konsisten di seluruh platform Absenta.

Sistem ini memungkinkan admin tenant mengisi struktur organisasi sekolah dan menetapkan jabatan kepada guru atau siswa.

Jabatan organisasi memberikan capability tambahan dan menentukan data scope user.

Implementasi harus mengikuti langkah-langkah berikut secara eksplisit.

---

# STEP 1 – Buat Model Database Baru

Tambahkan model berikut pada schema Prisma.

Model 1 – organizational_positions

Field:

id (uuid, primary key)
tenant_id (uuid)
code (string)
name (string)
scope_type (string)
unit_type (string nullable)
is_active (boolean default true)
created_at
updated_at

Tambahkan unique index:

tenant_id + code

---

Model 2 – organizational_assignments

Field:

id
tenant_id
position_id
user_id
kelas_id (nullable)
unit_id (nullable)
start_date
end_date
is_active

Tambahkan unique constraint:

user_id + position_id + kelas_id

---

Model 3 – organizational_capabilities

Field:

id
position_id
permission_id
conditions (json nullable)

Tambahkan unique constraint:

position_id + permission_id

---

# STEP 2 – Migrasi Data Lama

Migrasi data dari tabel lama.

Mapping:

StrukturOrganisasi → organizational_positions
GuruStrukturOrganisasi → organizational_assignments
SiswaStrukturOrganisasi → organizational_assignments
StrukturPermission → organizational_capabilities

Pastikan semua assignment guru dan siswa tetap tersimpan.

---

# STEP 3 – Buat OrganizationalAuthorizationEngine

Buat service baru:

src/modules/auth/services/organizational-authorization.engine.ts

Service ini harus memiliki fungsi berikut.

---

resolveOrganizationalContext(userId)

Langkah implementasi:

1. Query organizational_assignments untuk user tersebut.
2. Filter assignment aktif.
3. Join dengan organizational_positions.
4. Ambil semua position yang dimiliki user.
5. Return object:

positions
kelas_ids
unit_ids

---

resolveOrganizationalCapabilities(userId)

Langkah implementasi:

1. Ambil assignment user.
2. Ambil position_id.
3. Query organizational_capabilities.
4. Ambil permission_id dari semua position.
5. Return array capability tambahan.

---

resolveDataScope(userId)

Langkah implementasi:

1. Ambil semua assignment organisasi user.
2. Jika position memiliki kelas_id maka masukkan ke kelas_scope.
3. Jika tidak ada kelas_id maka user memiliki akses tenant-wide.
4. Return object:

kelas_scope
unit_scope

---

# STEP 4 – Integrasi dengan AuthorizationService

Modifikasi AuthorizationService.resolveUserCapabilities().

Tambahkan langkah berikut setelah role capabilities.

1. Panggil OrganizationalAuthorizationEngine.resolveOrganizationalCapabilities(userId)
2. Gabungkan capability dari role dan organizational positions
3. Return gabungan capability.

---

# STEP 5 – Tambahkan OrganizationalScopeMiddleware

Buat middleware baru:

src/middlewares/organizationalScope.ts

Middleware ini harus:

1. Mengambil userId dari request
2. Memanggil resolveDataScope(userId)
3. Menyimpan hasil pada request.organizationalScope

Contoh output:

request.organizationalScope = {
kelas_ids: [...],
unit_ids: [...]
}

---

# STEP 6 – Integrasi Middleware ke Pipeline

Tambahkan middleware ini setelah CapabilityGuard pada router utama.

Pipeline final:

Auth
TenantResolver
SubscriptionGuard
ServiceFeatureGuard
CapabilityGuard
OrganizationalScopeMiddleware
Controller

---

# STEP 7 – Repository Layer Scope Enforcement

Repository layer harus menggunakan scope yang diberikan middleware.

Contoh query siswa:

WHERE kelas_id IN request.organizationalScope.kelas_ids

Jika scope kosong maka default tenant scope.

---

# STEP 8 – Endpoint untuk Manajemen Struktur

Tambahkan endpoint berikut.

GET /academic/organizational-positions
POST /academic/organizational-positions
PUT /academic/organizational-positions/:id
DELETE /academic/organizational-positions/:id

POST /academic/organizational-assignments
DELETE /academic/organizational-assignments/:id

PUT /academic/organizational-positions/:id/capabilities

Endpoint ini digunakan admin tenant untuk mengisi struktur organisasi sekolah.

---

# STEP 9 – Sinkronisasi Wali Kelas

Ketika wali kelas di-set pada modul academic:

1. Pastikan position WALIKELAS ada.
2. Buat assignment pada organizational_assignments.
3. Set kelas_id sesuai kelas wali.

---

# STEP 10 – Sinkronisasi Petugas Kelas

Ketika siswa ditetapkan sebagai petugas kelas:

1. Pastikan position PETUGAS_KELAS ada.
2. Buat assignment organizational_assignments.
3. Set kelas_id sesuai kelas siswa.

---

# STEP 11 – Verification

Pastikan skenario berikut berhasil.

Case 1
Guru tanpa jabatan organisasi hanya melihat data kelasnya sendiri.

Case 2
Guru yang menjadi wali kelas dapat melihat seluruh siswa di kelas binaannya.

Case 3
Siswa yang menjadi petugas kelas dapat melakukan operasi absensi kelas.

Case 4
Admin tenant dapat menambah jabatan organisasi baru tanpa perubahan kode.

---

Implementasi selesai jika seluruh capability tambahan dan data scope dihasilkan dari OrganizationalAuthorizationEngine secara konsisten.
