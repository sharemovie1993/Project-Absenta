Instruksi Implementasi – Sidebar Rendering Engine

Tujuan implementasi ini adalah menggantikan mekanisme sidebar statis berbasis seed dengan Sidebar Rendering Engine yang dinamis.

Sidebar akan dirender berdasarkan:

* capability user
* feature subscription tenant
* organizational assignment
* menu configuration di database

Engine ini akan memastikan sidebar selalu sinkron dengan sistem authorization platform.

---

# PHASE 1 – Sidebar Engine Foundation

Buat service baru:

src/modules/menu/services/sidebar-rendering.service.ts

Service ini bertanggung jawab membangun sidebar berdasarkan context user.

Tambahkan method utama:

getSidebarForUser(context)

Parameter:

context = {
userId
role
capabilities
tenantFeatures
organizationalScope
}

Return:

array menu tree.

---

# PHASE 2 – Load Menu Configuration

Sidebar engine harus mengambil menu dari tabel Menu.

Query:

SELECT * FROM Menu
WHERE is_active = true
ORDER BY order ASC

Field yang digunakan:

id
parent_id
name
path
icon
order
required_capability
required_features
requires_petugas_active

---

# PHASE 3 – Feature Filter

Jika menu memiliki required_features:

* cek apakah feature tersebut ada dalam tenantFeatures.

Pseudo logic:

if menu.required_features != null
if not tenantFeatures.includes(menu.required_features)
skip menu

---

# PHASE 4 – Capability Filter

Jika menu memiliki required_capability:

cek apakah capability tersebut ada dalam context.capabilities.

Pseudo logic:

if menu.required_capability != null
if not context.capabilities.includes(menu.required_capability)
skip menu

---

# PHASE 5 – Organizational Condition Filter

Jika menu memiliki requires_petugas_active = true

cek:

context.organizationalScope.petugasActive

Jika false maka menu tidak ditampilkan.

---

# PHASE 6 – Build Menu Tree

Setelah menu difilter:

1. Kelompokkan menu berdasarkan parent_id.
2. Bangun struktur tree.

Pseudo:

mapMenuByParentId()

Return struktur:

[
{
name,
path,
icon,
children: [...]
}
]

---

# PHASE 7 – Parent Visibility Rule

Parent menu hanya muncul jika memiliki child visible.

Jika:

children.length == 0

maka parent tidak ditampilkan.

---

# PHASE 8 – Sidebar Cache

Tambahkan caching untuk sidebar.

Redis key:

sidebar:user:{userId}

TTL:

300 seconds

Langkah:

1. cek cache sebelum membangun sidebar
2. jika cache ada → return cache
3. jika tidak → build sidebar lalu cache

---

# PHASE 9 – Cache Invalidation

Cache sidebar harus dihapus ketika terjadi:

* role berubah
* organizational assignment berubah
* tenant subscription berubah
* capability user berubah

Tambahkan invalidation pada service terkait.

---

# PHASE 10 – Sidebar API Endpoint

Tambahkan endpoint baru:

GET /api/menu/sidebar

Controller:

menu.controller.ts

Controller memanggil:

SidebarRenderingService.getSidebarForUser()

Return:

{
sidebar: [...]
}

---

# PHASE 11 – Frontend Integration

Frontend Sidebar tidak lagi menggunakan menu statis.

Frontend harus:

1. memanggil API /api/menu/sidebar saat login
2. menyimpan hasil pada state
3. merender menu tree dari response API

Hapus logic capability filtering di frontend.

Semua filtering harus terjadi di backend.

---

# PHASE 12 – Verification

Lakukan pengujian berikut.

Case 1

ADMIN tenant tanpa layanan tambahan.

Sidebar hanya menampilkan CORE menu.

Case 2

Tenant membeli layanan ABSENSI.

Menu Absensi otomatis muncul.

Case 3

SISWA tanpa assignment.

Menu absensi operasional tidak muncul.

Case 4

SISWA menjadi PETUGAS_KELAS.

Menu Scan Absensi muncul.

Case 5

Tenant membeli layanan KOPERASI.

Menu Koperasi muncul.

---

# Output

Simpan dokumentasi implementasi pada:

docs/architecture/SIDEBAR_RENDERING_ENGINE.md

Dokumen harus menjelaskan:

* struktur sidebar engine
* filtering rules
* caching
* integration dengan authorization system
