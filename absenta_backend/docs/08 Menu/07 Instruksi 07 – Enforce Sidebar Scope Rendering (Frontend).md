Instruksi 07 – Enforce Sidebar Scope Rendering (Frontend)

Tujuan perubahan ini adalah memastikan frontend hanya merender menu berdasarkan scope yang diterima dari API `/api/menu/sidebar`.

Masalah saat ini:
Sidebar masih menampilkan menu tenant seperti:

Dashboard
Langganan Saya
Settings
Layanan
Data Master
Akademik
Absensi
Koperasi

padahal role yang login adalah SUPERADMIN.

Menu tersebut memiliki `scope = TENANT` dan tidak boleh muncul pada Platform Console.

Perubahan ini memastikan sidebar hanya menampilkan menu yang dikirim backend.

---

# STEP 1 – Hapus Navigation Config Statis

Cari file frontend yang mendefinisikan sidebar secara statis.

Biasanya berada pada:

frontend/src/navigation
frontend/src/layout/sidebar
frontend/src/components/sidebar

Jika terdapat definisi seperti:

const navigation = [...]

atau

const sidebarItems = [...]

hapus definisi menu statis untuk:

Dashboard
Langganan Saya
Settings
Layanan

Sidebar harus menggunakan data dari API.

---

# STEP 2 – Gunakan Data dari API

Sidebar harus mengambil menu dari endpoint:

GET /api/menu/sidebar

Data response API harus menjadi satu-satunya sumber menu.

Contoh:

const { data } = useQuery(['sidebar'], fetchSidebarMenu)

renderSidebar(data)

---

# STEP 3 – Hapus Merge Menu

Periksa apakah ada kode yang melakukan merge seperti:

const finalMenu = [...staticMenu, ...apiMenu]

Jika ada, hapus merge tersebut.

Sidebar hanya boleh menggunakan:

apiMenu

---

# STEP 4 – SUPERADMIN Rendering Rule

Pastikan tidak ada fallback yang menambahkan menu tenant ketika role SUPERADMIN login.

Sidebar harus langsung merender response API tanpa manipulasi tambahan.

---

# STEP 5 – Verification

Login sebagai:

SUPERADMIN

Panggil:

GET /api/menu/sidebar

Expected root menu:

Tenants
Billing
Observability
Infrastructure
Administration

Menu berikut tidak boleh muncul:

Dashboard
Langganan Saya
Settings
Layanan

---

# STEP 6 – Regression Check

Login sebagai user tenant (ADMIN/GURU).

Expected menu tetap normal:

Dashboard
Layanan
Langganan Saya
Settings

---

# Expected Result

Sidebar sepenuhnya dikontrol oleh backend menu engine.

SUPERADMIN hanya melihat menu `scope = PLATFORM`.

Tenant user hanya melihat menu `scope = TENANT`.
