Instruksi 03 – Introduce Menu Scope (Platform vs Tenant)

Tujuan perubahan ini adalah memperkenalkan pemisahan scope menu antara:

* Tenant Application Menu
* Platform Console Menu

Saat ini tabel Menu hanya berisi menu tenant dan digunakan oleh semua role termasuk SUPERADMIN.
Hal ini tidak ideal untuk arsitektur SaaS karena platform operator seharusnya memiliki menu console yang terpisah.

Perubahan ini menambahkan field scope pada tabel Menu dan menyesuaikan sidebar engine agar memfilter menu berdasarkan role context.

Perubahan ini tidak mengubah endpoint API yang sudah ada.

---

# STEP 1 – Tambahkan Field Scope pada Menu Table

File:

prisma/schema.prisma

Tambahkan enum baru:

enum MenuScope {
TENANT
PLATFORM
}

Tambahkan field pada model Menu:

scope MenuScope @default(TENANT)

Field ini menentukan apakah menu digunakan oleh:

TENANT → ADMIN / GURU / SISWA
PLATFORM → SUPERADMIN

Setelah perubahan schema:

jalankan migration.

---

# STEP 2 – Migration

Jalankan migration:

npx prisma migrate dev --name add_menu_scope

Pastikan seluruh data menu lama otomatis memiliki:

scope = TENANT

Ini menjaga kompatibilitas dengan menu yang sudah di-seed sebelumnya.

---

# STEP 3 – Update Seeder Menu Canonical

File:

prisma/seed.ts

Saat melakukan upsert menu canonical, tambahkan field:

scope: "TENANT"

Contoh:

Dashboard
scope = TENANT

Layanan
scope = TENANT

Absensi
scope = TENANT

Koperasi
scope = TENANT

Langganan Saya
scope = TENANT

Notifications
scope = TENANT

Settings
scope = TENANT

Semua menu canonical tenant harus eksplisit memiliki scope TENANT.

---

# STEP 4 – Update Sidebar Rendering Engine

File:

src/modules/menu/services/sidebar-rendering.service.ts

Tambahkan filtering berdasarkan scope sebelum filtering lainnya.

Pseudo logic:

if user.role == SUPERADMIN:
allowedScope = PLATFORM
else:
allowedScope = TENANT

Filter menu:

menu.scope must equal allowedScope

Artinya:

SUPERADMIN hanya menerima menu PLATFORM.
Role lain hanya menerima menu TENANT.

Filter ini harus dijalankan sebelum:

* feature filter
* capability filter
* petugasActive filter
* parent pruning

---

# STEP 5 – Pastikan Backward Compatibility

Endpoint tetap:

GET /api/menu/sidebar

Namun hasil sidebar sekarang bergantung pada role context.

Contoh hasil:

ADMIN:

Dashboard
Layanan
Langganan Saya
Notifications
Settings

SUPERADMIN:

(tidak ada menu tenant lagi)

Pada tahap ini SUPERADMIN kemungkinan menerima sidebar kosong karena menu platform belum dibuat. Ini expected behaviour.

---

# STEP 6 – Unit Test

Perbarui atau tambahkan unit test pada:

sidebar-rendering.service.test.ts

Test scenario:

Case 1 – ADMIN user

Expected:

menu scope TENANT muncul.

Case 2 – SUPERADMIN user

Expected:

menu scope TENANT tidak muncul.

Case 3 – Scope filter tidak merusak feature inheritance.

Pastikan feature inheritance tetap berjalan setelah scope filtering.

---

# STEP 7 – Verification

Setelah implementasi:

jalankan:

npm run build
npm run test:unit

Kemudian lakukan test manual.

Login sebagai:

ADMIN → panggil `/api/menu/sidebar`

Expected:

menu tenant muncul normal.

Login sebagai:

SUPERADMIN → panggil `/api/menu/sidebar`

Expected:

sidebar kosong (belum ada platform menu).

---

# Expected Result

Menu system sekarang memiliki pemisahan arsitektur:

TENANT MENU → untuk ADMIN, GURU, SISWA
PLATFORM MENU → untuk SUPERADMIN

SUPERADMIN tidak lagi menerima menu tenant.

Perubahan ini menjadi fondasi untuk langkah berikutnya yaitu implementasi Platform Console Menu.
