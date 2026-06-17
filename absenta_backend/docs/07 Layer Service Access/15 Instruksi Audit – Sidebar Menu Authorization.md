Instruksi Audit – Sidebar Menu Authorization

Platform Absenta menggunakan sidebar menu yang disimpan di database.

Menu sidebar ditampilkan kepada user berdasarkan capability yang dimiliki oleh user.

Sebelum menyusun RBAC seed matrix final, perlu dilakukan audit terhadap implementasi sidebar menu untuk memastikan:

* setiap menu memiliki capability yang benar
* tidak ada menu tanpa capability
* capability yang digunakan valid terhadap Action Catalog
* sidebar mengikuti authorization system yang sudah direfaktor

Tahap ini hanya melakukan audit dan dokumentasi.

Tidak boleh melakukan perubahan kode.

---

# STEP 1 – Identifikasi Model Sidebar

Cari model database yang menyimpan sidebar menu.

Kemungkinan nama tabel:

menus
sidebar_menus
navigation_items
menu_items

Catat struktur tabel tersebut.

Minimal field yang harus dicatat:

id
parent_id
name
path
icon
order
capability / permission_id
is_active

Jika capability disimpan sebagai string, catat field tersebut.

Jika menggunakan permission_id, catat relasinya.

---

# STEP 2 – Ekstrak Seluruh Menu Sidebar

Ambil seluruh menu dari database.

Buat daftar lengkap:

Menu Name
Path
Parent Menu
Capability / Permission

Simpan sebagai tabel.

Contoh format:

Menu Name | Path | Capability
Dashboard | /dashboard | dashboard.view.overview
Siswa | /academic/siswa | academic.students.view.list

---

# STEP 3 – Validasi Capability Menu

Bandingkan capability menu dengan Action Catalog canonical.

Periksa:

1. apakah capability tersebut ada di Action Catalog
2. apakah format capability benar (domain.resource.action)

Jika ditemukan capability yang tidak ada di Action Catalog, tandai sebagai:

INVALID_CAPABILITY

---

# STEP 4 – Identifikasi Menu Tanpa Capability

Cari menu yang:

* tidak memiliki capability
* atau capability null

Kategori menu tersebut sebagai:

PUBLIC_MENU
atau
MISCONFIGURED_MENU

Catat semua kasus ini.

---

# STEP 5 – Mapping Menu ke Module Service

Untuk setiap menu, identifikasi modul backend yang berkaitan.

Contoh:

Menu | Module
Dashboard | dashboard
Siswa | academic
Absensi | attendance
Koperasi | cooperative

Verifikasi bahwa capability menu sesuai dengan module tersebut.

---

# STEP 6 – Cross Check dengan RBAC Role

Ambil RBAC seed matrix yang ada saat ini.

Periksa:

* menu mana yang dapat diakses oleh role ADMIN
* menu mana yang dapat diakses oleh role GURU
* menu mana yang dapat diakses oleh role SISWA

Buat tabel seperti berikut:

Menu | Capability | ADMIN | GURU | SISWA

Isi YES atau NO.

---

# STEP 7 – Cross Check dengan Organizational Positions

Periksa apakah ada menu yang hanya muncul karena jabatan organisasi.

Contoh:

Menu absensi kelas mungkin hanya muncul untuk:

WALIKELAS
PETUGAS_KELAS

Periksa apakah frontend menggunakan capability atau organizational check.

Catat mekanismenya.

---

# STEP 8 – Identifikasi Menu Redundansi

Cari menu yang:

* memiliki capability yang sama
* mengarah ke path yang sama
* atau tidak lagi digunakan oleh modul backend

Tandai sebagai:

REDUNDANT_MENU

---

# STEP 9 – Hierarchy Validation

Pastikan struktur menu tidak memiliki masalah berikut:

* parent menu tanpa capability tetapi child memiliki capability
* child menu muncul tanpa parent
* menu orphan (parent_id tidak valid)

---

# STEP 10 – Hasil Audit

Buat laporan audit dengan struktur berikut.

File:

docs/architecture/SIDEBAR_AUTHORIZATION_AUDIT.md

Isi dokumen:

1. model database sidebar
2. daftar lengkap menu sidebar
3. capability yang digunakan menu
4. invalid capability
5. menu tanpa capability
6. mapping menu ke module
7. mapping menu ke role
8. potensi redundansi
9. rekomendasi perbaikan

---

# Tujuan Audit

Audit ini akan digunakan untuk:

* menyelaraskan sidebar dengan capability system
* menyusun RBAC seed matrix final
* memastikan menu platform konsisten dengan authorization engine
