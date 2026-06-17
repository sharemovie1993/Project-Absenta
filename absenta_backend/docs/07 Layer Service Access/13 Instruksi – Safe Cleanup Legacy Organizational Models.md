Instruksi – Safe Cleanup Legacy Organizational Models

Platform Absenta telah bermigrasi dari model organisasi lama ke model baru:

Model lama:

* StrukturOrganisasi
* GuruStrukturOrganisasi
* SiswaStrukturOrganisasi
* StrukturPermission

Model baru:

* OrganizationalPosition
* OrganizationalAssignment
* OrganizationalCapability

Audit runtime telah memastikan bahwa model lama tidak lagi dipakai oleh logic aplikasi.

Tahap ini bertujuan menghapus model legacy dari schema Prisma secara aman.

---

# STEP 1 – Verifikasi Final Runtime Usage

Scan seluruh codebase backend.

Pastikan tidak ada referensi berikut:

prisma.strukturOrganisasi
prisma.guruStrukturOrganisasi
prisma.siswaStrukturOrganisasi
prisma.strukturPermission

Jika ditemukan referensi:

* refactor ke model baru.

---

# STEP 2 – Verifikasi Foreign Key Dependencies

Periksa apakah tabel lain masih memiliki foreign key ke tabel lama.

Periksa pada schema.prisma:

StrukturOrganisasi
GuruStrukturOrganisasi
SiswaStrukturOrganisasi
StrukturPermission

Jika ada relasi tersisa, hapus relasi tersebut.

---

# STEP 3 – Backup Database Schema

Sebelum migration dijalankan:

buat backup schema database.

Jika menggunakan PostgreSQL:

pg_dump --schema-only > backup_schema.sql

---

# STEP 4 – Hapus Model Legacy dari Prisma Schema

Hapus definisi berikut dari schema.prisma:

model StrukturOrganisasi
model GuruStrukturOrganisasi
model SiswaStrukturOrganisasi
model StrukturPermission

Pastikan model baru tetap ada:

model OrganizationalPosition
model OrganizationalAssignment
model OrganizationalCapability

---

# STEP 5 – Generate Migration

Jalankan:

npx prisma migrate dev --name remove_legacy_organizational_models

Migration harus menghasilkan:

DROP TABLE StrukturOrganisasi
DROP TABLE GuruStrukturOrganisasi
DROP TABLE SiswaStrukturOrganisasi
DROP TABLE StrukturPermission

---

# STEP 6 – Regenerate Prisma Client

Setelah migration:

npx prisma generate

Pastikan TypeScript tidak memiliki error.

---

# STEP 7 – Verification

Jalankan:

npm run build
npm run test

Pastikan:

* tidak ada error runtime
* tidak ada query ke tabel lama
* SidebarRenderingEngine tetap berjalan
* OrganizationalAuthorizationEngine tetap berjalan

---

# STEP 8 – Documentation Update

Update dokumentasi arsitektur:

docs/architecture/ORGANIZATIONAL_AUTHORIZATION_ENGINE.md

Tambahkan catatan bahwa:

legacy organizational schema telah dihapus sepenuhnya.

---

# Expected Result

Setelah cleanup selesai:

* hanya ada satu model organisasi aktif
* tidak ada legacy table
* Prisma schema lebih sederhana
* sistem authorization lebih mudah dipelihara
