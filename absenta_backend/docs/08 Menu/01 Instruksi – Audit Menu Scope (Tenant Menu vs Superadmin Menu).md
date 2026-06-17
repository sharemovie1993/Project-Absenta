Instruksi – Audit Menu Scope (Tenant Menu vs Superadmin Menu)

Tujuan audit ini adalah memastikan bahwa sistem menu Absenta sudah memiliki pemisahan yang jelas antara:

* Tenant Application Menu (ADMIN / GURU / SISWA)
* Platform Console Menu (SUPERADMIN)

Audit ini tidak melakukan perubahan kode terlebih dahulu.
Tujuannya hanya memetakan kondisi sistem menu saat ini.

---

# STEP 1 – Audit Menu Table

Periksa tabel berikut pada database:

Menu

Ambil seluruh data menu dan kelompokkan berdasarkan:

* path
* required_capability
* required_features
* requires_petugas_active

Tujuan audit ini:

memastikan apakah menu yang sudah di-seed adalah menu tenant application saja atau mencakup superadmin menu juga.

Laporkan:

* total jumlah menu
* daftar menu root level
* capability mapping setiap leaf menu

---

# STEP 2 – Audit Sidebar Rendering Service

Periksa file:

src/modules/dashboard/services/sidebar-rendering.service.ts

Tujuan audit:

memastikan bagaimana sistem menentukan visibility menu.

Periksa logika berikut:

* filtering berdasarkan capability
* filtering berdasarkan feature tenant
* filtering requires_petugas_active
* parent pruning logic

Laporkan:

* apakah service ini selalu menggunakan tenant context
* apakah ada kondisi khusus untuk SUPERADMIN

---

# STEP 3 – Audit SUPERADMIN Module

Periksa modul berikut:

src/modules/superadmin

Cari apakah ada endpoint menu khusus platform.

Contoh kemungkinan endpoint:

/api/superadmin/menu
/api/platform/menu

atau apakah superadmin menggunakan endpoint yang sama:

GET /api/menu/sidebar

Laporkan:

* apakah SUPERADMIN memakai sidebar yang sama dengan tenant
* atau memiliki sidebar sendiri

---

# STEP 4 – Audit Menu Scope

Periksa apakah tabel Menu memiliki field yang memisahkan scope menu.

Contoh field yang mungkin ada:

scope
context
is_platform_menu
tenant_only

Jika tidak ada field semacam ini, berarti menu saat ini hanya berlaku untuk tenant.

Laporkan:

* apakah Menu table memiliki pemisahan scope
* jika tidak ada, apakah SUPERADMIN akan menerima menu tenant

---

# STEP 5 – SUPERADMIN Capability Check

Login sebagai user dengan role:

SUPERADMIN

Panggil endpoint:

GET /api/menu/sidebar

Laporkan hasilnya:

* apakah menu tenant muncul
* apakah menu kosong
* apakah ada menu platform

---

# STEP 6 – Authorization Interaction Check

Periksa apakah capability SUPERADMIN memberikan akses ke semua menu tenant.

Contoh:

dashboard.view.overview
academic.students.view.list
attendance.recap.view.daily

Laporkan:

apakah SUPERADMIN secara otomatis dapat melihat seluruh menu tenant.

---

# STEP 7 – Expected Result

Audit ini harus menghasilkan laporan yang menjawab:

1. apakah Menu table saat ini hanya berisi tenant menu
2. apakah SUPERADMIN memiliki menu platform
3. apakah sidebar engine memisahkan tenant dan platform
4. apakah SUPERADMIN saat ini melihat menu tenant

---

# Output Yang Diharapkan

Laporan audit harus berisi:

1. daftar menu yang di-seed
2. hasil test GET /api/menu/sidebar untuk SUPERADMIN
3. analisis apakah menu system saat ini sudah memisahkan:

Tenant Application
vs
Platform Console

Tidak perlu melakukan perubahan kode pada tahap ini.
