Instruksi – Sidebar Menu Architecture Refactor

Refactor ini memperbaiki struktur menu sidebar agar sesuai dengan desain platform Absenta sebagai SaaS multi-service platform.

Perubahan hanya dilakukan pada:

prisma/seed.ts
SidebarRenderingService (jika perlu support divider)

Tidak boleh mengubah API contract atau authorization logic.

---

# TUJUAN REFACTOR

Menu "Layanan" harus menjadi halaman marketplace layanan.

Menu "Data Master", "Akademik", "Absensi", dan "Koperasi" harus berada di root sidebar.

Tambahkan pemisah visual (divider) antar grup menu.

---

# STRUKTUR MENU YANG BENAR

Sidebar harus memiliki struktur berikut.

Dashboard

Layanan

divider

Data Master
Akademik
Absensi
Koperasi

divider

Langganan Saya
Notifications
Settings

---

# STEP 1 – Refactor NAV_ITEMS di seed.ts

File:

prisma/seed.ts

Ubah struktur NAV_ITEMS menjadi berikut.

---

## Dashboard

label: Dashboard
path: /dashboard
required_capability: dashboard.view.overview
required_features: CORE

---

## Layanan (Marketplace)

Menu ini bukan parent menu.

Menu ini hanya menuju halaman marketplace layanan.

label: Layanan
path: /services
required_features: CORE

Menu ini tidak boleh memiliki children.

---

## Divider Pertama

Tambahkan divider setelah menu Layanan.

Contoh object menu:

type: divider

atau

label: **divider**

path: null

---

## Data Master (Root Menu)

label: Data Master
path: /menu/data-master
required_features: CORE

children:

Jurusan
Kelas
Mata Pelajaran
Guru
Siswa
Cetak Kartu Siswa
Struktur Organisasi
Wali Kelas
Users

---

## Akademik (Root Menu)

label: Akademik
path: /menu/akademik
required_features: CORE

children:

Tahun Pelajaran
Semester
Guru Mapel
Mutasi Siswa
Data Backup

---

## Absensi (Root Menu)

label: Absensi
path: /menu/attendance
required_features: ABSENSI

children:

Scan
Rekap Harian
Rekap Bulanan
Rekap per Kelas
Petugas Kelas
Jadwal
Face Recognition

---

## Koperasi (Root Menu)

label: Koperasi
path: /menu/cooperative
required_features: KOPERASI

children:

Dashboard
Anggota
Simpanan
Pinjaman
POS
Laporan

---

## Divider Kedua

Tambahkan divider sebelum menu account.

---

## Langganan Saya

label: Langganan Saya
path: /billing/my-subscription
required_capability: billing.my_subscription.view

---

## Notifications

label: Notifications
path: /menu/notifications

children:

Notifikasi Saya
Pengaturan Notifikasi
Subscriptions
WhatsApp Health

---

## Settings

label: Settings
path: /settings
required_capability: core.sekolah.view.profile

---

# STEP 2 – Support Divider di Sidebar Rendering Engine

Jika item.type == divider

maka sidebar harus merender:

<hr class="sidebar-divider" />

Divider tidak memiliki:

path
capability
feature

Divider hanya berfungsi sebagai pemisah visual.

---

# STEP 3 – Parent Visibility Rule

Parent menu harus tampil jika minimal satu child visible.

Jika semua child tidak visible karena:

feature
capability

maka parent menu harus disembunyikan.

---

# STEP 4 – Menu Feature Filtering

SidebarRenderingService harus tetap memfilter menu berdasarkan:

required_features

Contoh:

Absensi hanya tampil jika tenant memiliki feature:

ABSENSI

Koperasi hanya tampil jika tenant memiliki feature:

KOPERASI

---

# STEP 5 – Authorization Compatibility

Menu harus tetap mengikuti capability.

Contoh:

Users → core.users.view.list

Petugas Kelas → attendance.officers.manage

Jika user tidak memiliki capability maka menu tidak tampil.

---

# STEP 6 – Seed Verification

Setelah menjalankan:

npm run prisma:seed

Periksa tabel Menu.

Pastikan:

Data Master berada di root
Akademik berada di root
Absensi berada di root
Layanan tidak memiliki child

---

# STEP 7 – Sidebar API Test

Panggil endpoint:

GET /api/menu/sidebar

Pastikan hasilnya:

Dashboard
Layanan

divider

Data Master
Akademik
Absensi

divider

Langganan Saya
Notifications
Settings

---

# HASIL YANG DIHARAPKAN

Sidebar menjadi:

Dashboard
Layanan

────────

Data Master
Akademik
Absensi
Koperasi

────────

Langganan Saya
Notifications
Settings

Menu mengikuti capability dan layanan tenant.
