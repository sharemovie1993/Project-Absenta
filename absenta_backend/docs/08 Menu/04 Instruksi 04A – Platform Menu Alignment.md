Instruksi 04A – Platform Menu Alignment

Tujuan perubahan ini adalah menyelaraskan menu PLATFORM dengan path yang sudah digunakan oleh router frontend pada sistem Absenta.

Instruksi sebelumnya memperkenalkan namespace `/platform/*`.
Namun setelah audit seed lama, ditemukan bahwa frontend sudah menggunakan path platform berikut:

/superadmin/*
/management/*
/billing/*
/tenants

Karena path tersebut sudah menjadi kontrak router frontend, menu PLATFORM harus menggunakan path yang sama.

Perubahan ini hanya menyesuaikan seeder menu PLATFORM agar mengikuti path yang sudah ada.

Endpoint API tidak berubah.

GET /api/menu/sidebar tetap digunakan.

---

# STEP 1 – Prinsip Path Platform

Menu PLATFORM harus menggunakan path berikut:

/tenants
/superadmin/*
/management/*
/billing/*

Jangan menggunakan namespace baru seperti:

/platform/*

Path platform harus mengikuti router yang sudah ada di frontend.

---

# STEP 2 – Struktur Canonical Menu PLATFORM

Struktur menu platform yang harus di-seed:

Tenants
path = /tenants
required_capability = core.tenants.view.list

Revenue
path = /superadmin/revenue
required_capability = superadmin.revenue.view.overview

Intelligence (group)
path = /menu/intelligence
required_capability = null

children:

Overview
path = /superadmin/intelligence
required_capability = core.tenants.view.list

Revenue Intelligence
path = /superadmin/intelligence/revenue
required_capability = core.tenants.view.list

Upgrade Intelligence
path = /superadmin/intelligence/upgrade
required_capability = core.tenants.view.list

Infra Control Center
path = /superadmin/infra/jobs
required_capability = core.tenants.view.list

---

Billing Console (group)
path = /menu/billing-console
required_capability = null

children:

Billing Dashboard
path = /billing/dashboard
required_capability = dashboard.view.financial_summary

Plans
path = /billing/plans
required_capability = billing.plans.view.list

Subscriptions
path = /billing/subscriptions
required_capability = billing.subscriptions.view.active

Invoices
path = /billing/invoices
required_capability = billing.invoices.view.list

Reports
path = /billing/reports
required_capability = billing.reports.view.summary

Settings
path = /billing/settings
required_capability = core.system.config.view

Monitoring
path = /billing/monitoring
required_capability = attendance.monitoring.view.live_status

Tripay Health
path = /billing/tripay-health
required_capability = attendance.monitoring.view.live_status

Tripay Simulator
path = /billing/tripay-simulator
required_capability = billing.invoices.view.list

---

System Management (group)
path = /menu/system-management
required_capability = null

children:

Role Management
path = /management/roles
required_capability = core.users.view.roles

Menu Management
path = /management/menus
required_capability = core.menu.view.list

Infrastructure
path = /superadmin/infra
required_capability = superadmin.infra.view.socket_global

---

# STEP 3 – Menu Scope

Semua menu platform harus memiliki:

scope = PLATFORM

Ini memastikan hanya SUPERADMIN yang menerima menu tersebut.

---

# STEP 4 – Feature Requirement

Menu PLATFORM tidak boleh memiliki required_features.

Set value:

required_features = null

Platform console tidak tergantung pada fitur tenant.

---

# STEP 5 – Seeder Upsert Logic

Seeder harus menggunakan lookup:

(path, scope)

Contoh:

where:
path: "/superadmin/revenue"
scope: PLATFORM

Ini mencegah konflik dengan menu tenant jika path sama.

---

# STEP 6 – Cleanup Logic

Logika cleanup menu lama harus dipisahkan per scope.

Cleanup menu tenant:

scope = TENANT

Cleanup menu platform:

scope = PLATFORM

Jangan sampai cleanup tenant mematikan menu platform.

---

# STEP 7 – Unit Test

Tambahkan test baru pada sidebar-rendering.service.test.ts

Test scenario:

Login sebagai SUPERADMIN.

Expected sidebar:

Tenants
Revenue
Intelligence
Billing Console
System Management

Tenant menu tidak boleh muncul.

---

# STEP 8 – Verification

Setelah implementasi:

jalankan

npm run build
npm run test:unit

Kemudian lakukan test manual.

Login sebagai SUPERADMIN.

Panggil endpoint:

GET /api/menu/sidebar

Expected result:

menu platform muncul menggunakan path lama
router frontend tetap bekerja

Login sebagai ADMIN.

Expected:

hanya menu tenant muncul.

---

# Expected Result

Menu platform sekarang menggunakan path router yang sudah ada.

Tidak ada namespace baru seperti /platform/*.

Router frontend tetap kompatibel.

Menu system Absenta sekarang memiliki dua layer yang jelas:

TENANT MENU
digunakan oleh ADMIN, GURU, SISWA

PLATFORM MENU
digunakan oleh SUPERADMIN
