Instruksi 06 – Platform Console Menu Refactor

Tujuan refactor ini adalah memperbaiki struktur domain menu PLATFORM (SUPERADMIN) agar lebih konsisten dengan domain SaaS operator console.

Perubahan ini hanya memindahkan grouping menu tanpa mengubah:

* path router
* required_capability
* endpoint API

Semua perubahan dilakukan pada parent menu (group node).

---

# STEP 1 – Domain Target Menu

Struktur menu PLATFORM yang baru harus menjadi:

Tenants
Billing
Observability
Infrastructure
Administration

---

# STEP 2 – Update Parent Menu Group

## Billing

Parent baru:

name: Billing
path: /menu/billing-console
required_capability: null
scope: PLATFORM

Child menu yang harus berada di bawah Billing:

Revenue
/billing/dashboard
/billing/plans
/billing/subscriptions
/billing/invoices
/billing/reports

Catatan:

Menu Revenue (`/superadmin/revenue`) harus dipindahkan ke group Billing.

---

## Observability

Parent baru:

name: Observability
path: /menu/observability
required_capability: null
scope: PLATFORM

Child menu:

/superadmin/intelligence
/superadmin/intelligence/revenue
/superadmin/intelligence/upgrade
/billing/monitoring
/billing/tripay-health

Menu yang harus dipindahkan ke Observability:

Monitoring
Tripay Health

---

## Infrastructure

Parent baru:

name: Infrastructure
path: /menu/infrastructure
required_capability: null
scope: PLATFORM

Child menu:

/superadmin/infra
/superadmin/infra/jobs

Menu Infra Control Center tetap berada di sini.

---

## Administration

Rename parent menu:

System Management → Administration

Parent:

name: Administration
path: /menu/system-management
required_capability: null
scope: PLATFORM

Child menu tetap:

/management/roles
/management/menus

---

# STEP 3 – Move Revenue Menu

Menu:

Revenue
path: /superadmin/revenue

harus dipindahkan ke parent Billing.

Update parent_id sesuai Billing group.

---

# STEP 4 – Move Monitoring Menu

Menu:

/billing/monitoring
/billing/tripay-health

harus dipindahkan dari Billing Console ke Observability.

Update parent_id.

---

# STEP 5 – Seeder Update

Perbarui definisi menu PLATFORM di:

prisma/seed.ts

Pastikan tree menu mengikuti struktur domain baru.

Upsert tetap menggunakan:

(path, scope)

---

# STEP 6 – Cleanup Parent Menu Lama

Parent menu berikut harus dinonaktifkan jika sudah tidak digunakan:

/menu/intelligence

Jika child sudah dipindahkan ke Observability.

Gunakan:

is_active = false

---

# STEP 7 – Unit Test

Perbarui unit test:

sidebar-rendering.service.test.ts

Test scenario:

Login SUPERADMIN.

Expected root menu:

Tenants
Billing
Observability
Infrastructure
Administration

Tenant menu tidak muncul.

---

# STEP 8 – Verification

Setelah implementasi:

jalankan:

npm run build
npm run test:unit

Kemudian test manual:

Login SUPERADMIN

GET /api/menu/sidebar

Expected root:

Tenants
Billing
Observability
Infrastructure
Administration

---

# Expected Result

Menu SUPERADMIN sekarang memiliki domain yang jelas:

TENANT MANAGEMENT
→ Tenants

BILLING
→ Revenue, Plans, Subscriptions, Invoices, Reports

OBSERVABILITY
→ Revenue Intelligence, Upgrade Intelligence, Monitoring, Tripay Health

INFRASTRUCTURE
→ Infra Control Center, Infrastructure

ADMINISTRATION
→ Role Management, Menu Management

Refactor ini membuat sidebar platform console lebih konsisten dengan domain SaaS operator.
