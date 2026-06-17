Instruksi – SaaS Feature Governance Layer Implementation

Tujuan implementasi ini adalah membuat sistem feature governance untuk platform Absenta sehingga layanan yang belum dibeli tetap terlihat di sidebar tetapi dalam keadaan terkunci (locked).

User dapat melihat halaman layanan tetapi tidak dapat melakukan operasi CRUD sebelum layanan diaktifkan.

Implementasi harus tetap kompatibel dengan:

SidebarRenderingService
ServiceFeatureGuard
CapabilityGuard
RBAC Authorization

Tidak boleh mengubah API contract yang sudah dipakai frontend.

---

# STEP 1 – Tambahkan Feature State Model

Setiap menu layanan harus memiliki state.

State yang digunakan:

ACTIVE
LOCKED
PREVIEW

ACTIVE berarti tenant sudah memiliki layanan.

LOCKED berarti tenant belum membeli layanan.

PREVIEW berarti tenant dapat melihat halaman tetapi tidak dapat melakukan perubahan data.

State ini tidak perlu ditambahkan ke database.
State dihitung secara runtime oleh SidebarRenderingService.

---

# STEP 2 – Update SidebarRenderingService

File:

sidebar-rendering.service.ts

Saat ini menu difilter berdasarkan required_features.

Logic lama:

if tenantFeature != requiredFeature
hide menu

Logic baru:

if tenantFeature != requiredFeature
menu.locked = true

Menu tetap dikirim ke frontend tetapi diberi flag locked.

Contoh response API:

{
label: "Absensi",
path: "/menu/attendance",
required_feature: "ABSENSI",
locked: true
}

Jika tenant sudah membeli layanan:

{
label: "Absensi",
path: "/menu/attendance",
required_feature: "ABSENSI",
locked: false
}

---

# STEP 3 – Sidebar UI Locked Mode

Frontend harus menampilkan menu locked dengan style berbeda.

Style:

opacity 0.6
cursor pointer
ikon lock

Contoh tampilan:

🔒 Absensi
🔒 Koperasi

Menu tetap bisa diklik.

---

# STEP 4 – Preview Mode pada Halaman Layanan

Jika menu locked dibuka maka halaman harus tampil dalam mode preview.

Preview mode memiliki aturan:

Semua tombol CRUD disabled.

Contoh:

Tambah Data
Edit
Hapus

harus disabled.

Contoh UI:

"Fitur ini tersedia pada paket berbayar."

Tambahkan tombol:

Upgrade Sekarang

yang mengarah ke:

/services

---

# STEP 5 – Backend Mutation Protection

Walaupun UI disabled, backend tetap harus memblokir operasi mutation.

ServiceFeatureGuard tetap aktif.

Endpoint berikut harus diblok jika feature belum aktif:

POST
PUT
PATCH
DELETE

Response yang diberikan:

HTTP 403

{
code: "FEATURE_NOT_ENABLED",
message: "Fitur ini belum aktif pada paket Anda."
}

Endpoint GET tetap diperbolehkan.

---

# STEP 6 – Banner Upgrade

Tambahkan banner di halaman preview.

Contoh banner:

Fitur Absensi belum aktif pada paket Anda.

Upgrade paket untuk menggunakan fitur ini.

[Upgrade Sekarang]

Tombol upgrade menuju:

/services

---

# STEP 7 – Locked Child Menu

Jika parent menu locked maka child menu juga locked.

Contoh:

🔒 Absensi
🔒 Scan
Rekap Harian
Rekap Bulanan

Rekap tetap bisa dilihat.

Scan dan operasi lainnya disabled.

---

# STEP 8 – Sidebar API Response Extension

Response endpoint:

GET /api/menu/sidebar

Tambahkan field:

locked

Contoh:

{
label: "Koperasi",
path: "/menu/cooperative",
locked: true
}

---

# STEP 9 – Authorization Compatibility

Capability guard tetap berjalan seperti biasa.

Jika user memiliki capability tetapi feature tidak aktif maka:

mutation tetap ditolak oleh ServiceFeatureGuard.

Urutan guard tetap:

Auth
Tenant
Subscription
ServiceFeatureGuard
CapabilityGuard

---

# STEP 10 – Verification

Simulasikan tenant dengan kondisi berikut:

Tenant tanpa layanan Absensi

Sidebar harus menampilkan:

Dashboard
Layanan

divider

Data Master
Akademik
🔒 Absensi
🔒 Koperasi

divider

Langganan Saya
Notifications
Settings

Ketika membuka halaman Absensi:

halaman tampil
CRUD disabled
banner upgrade muncul

---

# EXPECTED RESULT

Platform Absenta memiliki sistem preview layanan SaaS.

User dapat melihat fitur layanan sebelum membeli tetapi tidak dapat melakukan operasi data.

Hal ini meningkatkan konversi upgrade dan memberikan transparansi fitur kepada tenant.
