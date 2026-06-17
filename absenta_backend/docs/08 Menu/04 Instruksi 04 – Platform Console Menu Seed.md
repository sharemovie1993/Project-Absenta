Instruksi 04 – Platform Console Menu Seed

Tujuan perubahan ini adalah membuat menu khusus untuk Platform Console yang digunakan oleh role SUPERADMIN.

Menu platform ini dipisahkan dari tenant menu melalui field Menu.scope = PLATFORM.

Endpoint API tidak berubah. Sidebar engine yang sudah diperbarui akan otomatis menampilkan menu platform untuk SUPERADMIN.

---

# STEP 1 – Definisikan Struktur Menu Platform

Tambahkan definisi canonical menu platform di seeder.

Struktur menu:

Platform

* Platform Dashboard
* Tenants
* Subscriptions
* Invoices
* Revenue
* Workers
* System Health
* Logs
* Feature Flags

Struktur tree:

Platform (group)
Platform Dashboard
Tenants
Subscriptions
Invoices
Revenue
Workers
System Health
Logs
Feature Flags

Parent menu "Platform" harus memiliki:

required_capability = null

karena parent hanya berfungsi sebagai grouping.

---

# STEP 2 – Capability Mapping

Leaf menu harus menggunakan capability canonical yang sudah ada di Action Catalog.

Mapping:

Platform Dashboard
required_capability = dashboard.view.platform

Tenants
required_capability = platform.tenants.view.list

Subscriptions
required_capability = billing.subscriptions.view

Invoices
required_capability = billing.invoices.view

Revenue
required_capability = billing.revenue.view

Workers
required_capability = system.workers.view

System Health
required_capability = system.health.view

Logs
required_capability = system.logs.view

Feature Flags
required_capability = system.feature_flags.manage

Jika capability belum ada pada Action Catalog, tambahkan capability tersebut ke catalog terlebih dahulu sebelum seeding menu.

---

# STEP 3 – Menu Scope

Semua menu platform harus memiliki:

scope = PLATFORM

Contoh seeding:

Platform
scope = PLATFORM
required_capability = null

Tenants
scope = PLATFORM
required_capability = platform.tenants.view.list

Subscriptions
scope = PLATFORM
required_capability = billing.subscriptions.view

Dan seterusnya.

---

# STEP 4 – Feature Assignment

Menu platform tidak bergantung pada tenant feature.

Oleh karena itu:

required_features = null

untuk seluruh menu platform.

---

# STEP 5 – Seeder Upsert Logic

Gunakan upsert seperti pada menu tenant, tetapi lookup harus menggunakan:

(path, scope)

Contoh:

where:
path: "/platform/tenants"
scope: PLATFORM

Ini mencegah konflik dengan menu tenant jika path sama.

---

# STEP 6 – Prevent Tenant Cleanup

Pada logika cleanup menu lama (yang mengubah is_active=false), pastikan hanya berlaku untuk:

scope = TENANT

Menu platform tidak boleh ikut terkena cleanup.

---

# STEP 7 – SUPERADMIN Capability

Pastikan role SUPERADMIN memiliki capability yang diperlukan untuk menu platform.

Jika SUPERADMIN sudah memiliki wildcard capability, tidak perlu perubahan tambahan.

Jika tidak, tambahkan capability berikut ke role SUPERADMIN:

dashboard.view.platform
platform.tenants.view.list
billing.subscriptions.view
billing.invoices.view
billing.revenue.view
system.workers.view
system.health.view
system.logs.view
system.feature_flags.manage

---

# STEP 8 – Unit Test

Tambahkan test baru pada:

sidebar-rendering.service.test.ts

Scenario:

Login sebagai SUPERADMIN.

Mock menu dengan scope PLATFORM.

Expected result:

Sidebar berisi menu:

Platform
Platform Dashboard
Tenants
Subscriptions
Invoices
Revenue
Workers
System Health
Logs
Feature Flags

Pastikan menu TENANT tidak muncul.

---

# STEP 9 – Verification

Setelah implementasi:

jalankan:

npm run build
npm run test:unit

Kemudian lakukan test manual.

Login sebagai SUPERADMIN.

Panggil endpoint:

GET /api/menu/sidebar

Expected result:

Platform
Platform Dashboard
Tenants
Subscriptions
Invoices
Revenue
Workers
System Health
Logs
Feature Flags

Login sebagai user tenant.

Expected result:

menu tenant tetap muncul seperti sebelumnya.

---

# Expected Result

Platform Console sekarang memiliki menu sendiri yang terpisah dari tenant application.

SUPERADMIN tidak lagi menerima menu tenant.

Menu system Absenta sekarang terdiri dari:

TENANT MENU
digunakan oleh ADMIN, GURU, SISWA

PLATFORM MENU
digunakan oleh SUPERADMIN

Ini menyelesaikan pemisahan arsitektur antara platform operator dan tenant application.
