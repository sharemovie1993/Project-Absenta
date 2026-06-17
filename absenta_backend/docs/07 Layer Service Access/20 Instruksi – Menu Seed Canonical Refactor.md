Instruksi – Menu Seed Canonical Refactor

Tujuan refactor ini adalah menyelaraskan seed menu dengan:

* Action Catalog canonical
* RBAC baseline
* Organizational Authorization
* Sidebar Rendering Engine

Menu database harus menjadi konfigurasi canonical yang deterministik dan bebas dari capability legacy.

---

# STEP 1 – Audit Menu Seed Lama

Periksa file:

prisma/seed.ts

Identifikasi struktur menu lama (NAV_ITEMS atau sejenisnya).

Cari masalah berikut:

* required_capability menggunakan capability legacy
* menu yang mengarah ke path yang sudah tidak ada
* menu yang memiliki capability duplikat
* parent menu yang memiliki capability (seharusnya tidak)

Hasil audit dicatat sebagai referensi refactor.

---

# STEP 2 – Struktur Menu Canonical

Menu harus mengikuti struktur domain platform berikut.

Dashboard

Layanan

Data Master

* Jurusan
* Kelas
* Mata Pelajaran
* Guru
* Siswa
* Cetak Kartu Siswa
* Struktur Organisasi
* Wali Kelas
* Users

Akademik

* Tahun Pelajaran
* Semester
* Guru Mapel
* Mutasi Siswa
* Data Backup

Absensi

* Scan
* Rekap Harian
* Rekap Bulanan
* Rekap per Kelas
* Petugas Kelas
* Jadwal
* Face Recognition

Koperasi

* Dashboard
* Anggota
* Simpanan
* Pinjaman
* POS
* Laporan

Langganan Saya

Notifications

Settings

---

# STEP 3 – Capability Assignment

Setiap menu leaf harus memiliki capability canonical.

Contoh:

Dashboard
required_capability = dashboard.view.overview

Guru
required_capability = academic.teachers.view.list

Siswa
required_capability = academic.students.view.list

Rekap Harian
required_capability = attendance.recap.view.daily

Anggota
required_capability = cooperative.members.view.list

Langganan Saya
required_capability = billing.my_subscription.view

Settings
required_capability = core.sekolah.view.profile

---

# STEP 4 – Feature Flag Assignment

Tambahkan kolom required_features untuk mengontrol visibility berdasarkan layanan.

Contoh:

Dashboard → CORE

Data Master → CORE

Akademik → CORE

Absensi → ABSENSI

Koperasi → KOPERASI

Langganan Saya → CORE

Notifications → CORE

Settings → CORE

Sidebar Rendering Engine akan memfilter menu berdasarkan feature tenant.

---

# STEP 5 – Organizational Condition

Beberapa menu membutuhkan kondisi organisasi.

Tambahkan metadata berikut:

requires_petugas_active = true

Contoh:

Scan Absensi

Menu ini hanya muncul jika user memiliki position PETUGAS_KELAS.

---

# STEP 6 – Parent Menu Rules

Parent menu tidak boleh memiliki capability.

Parent hanya berfungsi sebagai grouping.

Contoh:

Data Master
required_capability = null

Akademik
required_capability = null

Absensi
required_capability = null

Koperasi
required_capability = null

Visibility parent ditentukan oleh child menu.

---

# STEP 7 – Deterministic Seed

Seeder harus menggunakan upsert berdasarkan path.

Contoh:

upsert Menu where path = '/dashboard'

Ini mencegah duplikasi jika seed dijalankan ulang.

---

# STEP 8 – Remove Legacy Menu

Hapus menu yang:

* menggunakan capability legacy
* tidak memiliki endpoint backend
* tidak sesuai dengan struktur canonical

Contoh dari audit sebelumnya:

menu yang menggunakan academic.view_*
menu yang menggunakan dashboard.view_overview

---

# STEP 9 – Verification

Setelah seed dijalankan:

periksa tabel Menu.

Pastikan:

* semua required_capability ada di Permission table
* tidak ada capability legacy
* parent menu tidak memiliki capability

---

# STEP 10 – Sidebar API Test

Panggil endpoint:

GET /api/menu/sidebar

Verifikasi hasil untuk role berikut:

ADMIN tanpa position
ADMIN dengan ADMIN_AKADEMIK
GURU
SISWA
SISWA dengan PETUGAS_KELAS

Menu harus berubah sesuai capability dan feature.

---

# STEP 11 – Documentation

Perbarui dokumen:

docs/architecture/SIDEBAR_MENU_CANONICAL.md

Dokumen harus berisi:

menu hierarchy
menu capability mapping
menu feature mapping
