Instruksi – Action Catalog Cleanup Migration

Platform Absenta telah melakukan audit terhadap Action Catalog.

Ditemukan capability legacy seperti:

* academic.manage_*
* academic.view_*
* attendance.manage_*
* dashboard.view_overview
* notify.view_stats

Capability tersebut adalah pola lama yang tidak sesuai dengan format canonical:

domain.resource.action

Karena sistem belum memiliki tenant production dan database dapat di-reset, kita akan melakukan cleanup penuh.

Tujuan migration:

* menghapus seluruh permission lama
* menghasilkan Action Catalog canonical
* seed ulang permission dan role permission

---

# STEP 1 – Freeze Canonical Action Catalog

Gunakan file berikut sebagai source of truth:

docs/action_catalog_canonical_futureproof.md

Capability yang ada di file tersebut dianggap canonical.

Legacy capability tidak boleh dimasukkan ke seed baru.

---

# STEP 2 – Remove Legacy Capability Mapping (Soft)

File:

src/config/legacy_capability_mapping.ts

Tidak perlu dihapus sepenuhnya, tetapi:

* tandai sebagai deprecated
* jangan lagi dipakai oleh AuthorizationService

Tambahkan komentar:

LEGACY_MAPPING_DEPRECATED

---

# STEP 3 – Reset Permission Table

Pada database:

hapus seluruh data tabel permission.

Contoh SQL:

TRUNCATE TABLE "Permission" CASCADE;

Ini juga akan menghapus:

RolePermission
StrukturPermission
atau tabel lain yang bergantung.

---

# STEP 4 – Regenerate Permission Seed

File:

prisma/seed_policies.ts

Refactor logic seed agar:

1. membaca capability dari Action Catalog canonical
2. membuat permission baru berdasarkan capability tersebut

Pseudo logic:

for each capability in ActionCatalog:
create Permission(id = capability)

Pastikan tidak ada capability legacy yang disertakan.

---

# STEP 5 – Rebuild RolePermission Seed

Gunakan RBAC Seed Matrix Final sebagai referensi.

Seed berikut harus dibuat ulang:

SUPERADMIN
ADMIN_ACADEMIC
ADMIN_COOPERATIVE
ADMIN_FINANCE
GURU
SISWA

Mapping capability role harus menggunakan canonical capability.

---

# STEP 6 – Regenerate Prisma Client

Jalankan:

npx prisma generate

---

# STEP 7 – Run Seed

Jalankan:

npx prisma db seed

Verifikasi:

* permission table hanya berisi capability canonical
* tidak ada capability legacy

---

# STEP 8 – Verification

Periksa:

SELECT COUNT(*) FROM "Permission";

Bandingkan dengan jumlah capability pada Action Catalog.

Jumlah harus sama.

---

# STEP 9 – Authorization Test

Verifikasi endpoint berikut masih berjalan:

* login
* /api/menu/sidebar
* endpoint academic
* endpoint attendance

Tidak boleh ada error:

CAPABILITY_NOT_FOUND

---

# STEP 10 – Documentation Update

Perbarui dokumen:

docs/architecture/ACTION_CATALOG.md

Tambahkan catatan:

Action Catalog telah dibersihkan dari capability legacy pada migration ini.

---

# Expected Result

Setelah migration:

* Permission table hanya berisi capability canonical
* RolePermission menggunakan capability canonical
* Legacy capability tidak lagi menjadi bagian dari sistem authorization
* Sidebar Rendering Engine tetap berjalan dengan capability baru
