Instruksi – RBAC Seed Matrix Implementation

Tujuan implementasi ini adalah menetapkan baseline capability untuk role sistem pada platform Absenta.

Role sistem tetap:

SUPERADMIN
ADMIN
GURU
SISWA

Spesialisasi kewenangan seperti ADMIN_AKADEMIK atau ADMIN_KOPERASI tidak menjadi role baru, tetapi ditangani melalui OrganizationalPosition.

---

# STEP 1 – Define Role Baseline

Pastikan tabel Role hanya memiliki role sistem berikut:

SUPERADMIN
ADMIN
GURU
SISWA

Seeder harus melakukan upsert role berdasarkan name.

---

# STEP 2 – SUPERADMIN Capability

SUPERADMIN memiliki akses penuh ke seluruh capability canonical.

Seeder logic:

ambil seluruh capability dari Action Catalog canonical
insert semuanya sebagai RolePermission untuk SUPERADMIN.

Pseudo:

for each permission in Permission:
create RolePermission(role="SUPERADMIN", permission=permission.id)

---

# STEP 3 – ADMIN Baseline Capability

Role ADMIN memiliki baseline capability untuk mengakses platform core.

Capability baseline:

dashboard.view.overview

core.sekolah.view.profile
core.sekolah.update.profile

core.users.view.list
core.users.create
core.users.update

notify.check.status
notify.push.view.subscriptions

billing.my_subscription.view

ADMIN tidak langsung memiliki capability domain akademik, koperasi, atau attendance.

Capability tambahan akan diberikan oleh OrganizationalPosition seperti:

ADMIN_AKADEMIK
ADMIN_KOPERASI
ADMIN_KEUANGAN

---

# STEP 4 – GURU Baseline Capability

Capability baseline untuk GURU:

dashboard.view.overview

academic.teaching.view
academic.teaching.rekap

attendance.recap.view.daily
attendance.recap.view.monthly

notify.view.my
notify.update.preferences

GURU tidak memiliki capability manajemen data akademik.

Capability tambahan diberikan oleh position seperti:

WALIKELAS

---

# STEP 5 – SISWA Baseline Capability

Capability baseline untuk SISWA:

dashboard.view.overview

attendance.recap.view.daily
attendance.recap.view.monthly

notify.view.my
notify.update.preferences

core.auth.logout

Capability tambahan diberikan oleh position seperti:

PETUGAS_KELAS

---

# STEP 6 – Clear Existing RolePermission

Sebelum seeding baseline baru, hapus semua RolePermission lama.

Contoh:

DELETE FROM "RolePermission";

Ini memastikan role baseline selalu deterministik.

---

# STEP 7 – Insert Baseline RolePermission

Insert RolePermission sesuai matrix di atas.

Pastikan hanya capability canonical yang digunakan.

---

# STEP 8 – Verification

Periksa jumlah capability tiap role.

SUPERADMIN → seluruh permission

ADMIN → sekitar 8–10 baseline permission

GURU → sekitar 6–8 permission

SISWA → sekitar 5–6 permission

---

# STEP 9 – Authorization Runtime Check

Verifikasi runtime berikut:

ADMIN tanpa organizational position
tidak bisa mengakses endpoint academic.

ADMIN dengan position ADMIN_AKADEMIK
dapat mengakses endpoint academic.

GURU tanpa WALIKELAS
tidak bisa membuat session absensi.

GURU dengan WALIKELAS
dapat membuat session absensi.

---

# STEP 10 – Documentation

Update dokumen:

docs/architecture/RBAC_MODEL.md

Dokumen harus menjelaskan:

role baseline capability
organizational capability extension
