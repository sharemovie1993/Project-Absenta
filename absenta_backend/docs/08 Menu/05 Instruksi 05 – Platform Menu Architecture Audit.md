Instruksi 05 – Platform Menu Architecture Audit

Tujuan audit ini adalah memetakan arsitektur menu platform (SUPERADMIN) secara menyeluruh sebelum dilakukan refactor menu domain.

Audit ini tidak mengubah kode sistem.
Tujuannya hanya menghasilkan laporan kondisi aktual menu platform.

---

# STEP 1 – Ekstrak Data Menu PLATFORM

Ambil seluruh menu dengan:

scope = PLATFORM

Query database:

SELECT
id,
name,
path,
parent_id,
scope,
required_capability,
required_features,
requires_petugas_active,
is_active
FROM "Menu"
WHERE scope = 'PLATFORM'
ORDER BY parent_id, path;

Output harus disajikan dalam dua bentuk:

1. Table data mentah
2. Tree structure menu

Contoh tree:

Tenants
Revenue
Intelligence
├ Overview
├ Revenue Intelligence
├ Upgrade Intelligence
└ Infra Control Center
Billing Console
├ Billing Dashboard
├ Plans
├ Subscriptions
└ Invoices

---

# STEP 2 – Mapping Menu → Capability

Buat mapping lengkap:

Menu Name
Path
Required Capability

Contoh:

Tenants → /tenants → core.tenants.view.list
Revenue → /superadmin/revenue → superadmin.revenue.view.overview

Audit ini bertujuan memastikan:

* capability canonical digunakan
* tidak ada capability legacy

---

# STEP 3 – Capability Availability Check

Periksa tabel Permission.

Pastikan semua capability yang digunakan menu PLATFORM:

* ada di Permission table
* tidak ada typo
* tidak ada capability orphan

Output:

Capability used by menu but missing in Permission table.

---

# STEP 4 – Router Path Audit

Verifikasi apakah semua path menu PLATFORM memiliki route di frontend.

Cari di frontend:

frontend/src

atau file router/navigation.

Mapping yang dihasilkan:

Menu Path
Frontend Route Exists (YES/NO)

Contoh:

/tenants → YES
/superadmin/revenue → YES
/billing/dashboard → YES

Jika ada path menu yang tidak memiliki router frontend, laporkan.

---

# STEP 5 – Domain Classification

Kelompokkan menu PLATFORM berdasarkan domain logis.

Kategori awal yang digunakan untuk audit:

TENANT_MANAGEMENT
BILLING
OBSERVABILITY
INFRASTRUCTURE
ADMINISTRATION
NOTIFICATIONS

Contoh hasil:

TENANT_MANAGEMENT

* Tenants

BILLING

* Billing Dashboard
* Plans
* Subscriptions
* Invoices
* Reports

OBSERVABILITY

* Revenue Intelligence
* Upgrade Intelligence
* Monitoring

INFRASTRUCTURE

* Infra Control Center
* Infrastructure

ADMINISTRATION

* Role Management
* Menu Management

---

# STEP 6 – Duplicate Domain Detection

Cari menu yang sebenarnya berada di domain sama tetapi tersebar di tempat berbeda.

Contoh kemungkinan:

Revenue
Billing Console

Jika dua menu berada pada domain sama (misalnya billing), catat sebagai:

domain duplication.

---

# STEP 7 – Tenant Menu Leak Check

Pastikan SUPERADMIN tidak menerima menu TENANT.

Test:

Login SUPERADMIN

Call endpoint:

GET /api/menu/sidebar

Periksa apakah ada menu berikut muncul:

Dashboard
Layanan
Akademik
Absensi
Koperasi
Langganan Saya

Jika ada muncul, berarti terjadi tenant menu leak.

---

# STEP 8 – Sidebar Depth Analysis

Periksa kedalaman tree menu.

Hitung:

max_depth

Contoh:

Platform
└ Intelligence
└ Revenue Intelligence

Jika depth > 3 laporkan.

Sidebar ideal:

max depth = 3.

---

# STEP 9 – Output Laporan

Laporan audit harus berisi:

1. Platform menu tree
2. Menu → capability mapping
3. Router path verification
4. Domain classification
5. Duplicate domain detection
6. Tenant menu leak check
7. Sidebar depth analysis

Tidak melakukan perubahan kode.

Audit ini hanya menghasilkan laporan kondisi sistem saat ini.
