Blueprint ini bertujuan merapihkan arsitektur middleware Absenta Platform yang telah berevolusi dari single SaaS absensi menjadi SaaS platform sekolah multi-service.

Refactor harus dilakukan tanpa merusak endpoint yang sudah berjalan.

Prinsip utama refactor:

* Tidak mengubah kontrak API
* Tidak memindahkan controller/service
* Tidak memecah module
* Fokus hanya pada pipeline middleware

---

# 1. Arsitektur Middleware Target

Pipeline middleware yang ditargetkan:

Request
↓
AuthMiddleware
↓
TenantResolverMiddleware
↓
TenantStatusMiddleware
↓
CoreSubscriptionMiddleware
↓
ServiceCapabilityMiddleware
↓
PermissionMiddleware
↓
DataScopeMiddleware
↓
Controller

Penjelasan layer:

AuthMiddleware
Memverifikasi JWT dan menghasilkan request.user.

TenantResolverMiddleware
Menentukan tenant dari token dan domain.

TenantStatusMiddleware
Memastikan tenant tidak suspended atau deleted.

CoreSubscriptionMiddleware
Memastikan tenant memiliki core_platform subscription aktif.

ServiceCapabilityMiddleware
Memastikan tenant memiliki layanan tertentu seperti ABSENSI atau KOPERASI.

PermissionMiddleware
Memastikan user memiliki capability/permission untuk endpoint tersebut.

DataScopeMiddleware
Membatasi data berdasarkan role (ADMIN, GURU, SISWA).

---

# 2. Struktur Middleware Setelah Refactor

Folder middleware akan distandarkan:

src/middlewares/

auth.middleware.ts
tenant-resolver.middleware.ts
tenant-status.middleware.ts
core-subscription.middleware.ts
service-capability.middleware.ts
permission.middleware.ts
data-scope.middleware.ts

Middleware lama tidak langsung dihapus, tetapi dipetakan ke struktur ini.

Contoh mapping:

auth.ts → auth.middleware.ts
tenant.ts → tenant-resolver + tenant-status
subscription.guard.ts → core-subscription.middleware.ts
capability.guard.ts → service-capability.middleware.ts
requireCapability.ts → permission.middleware.ts

---

# 3. Standarisasi Route Configuration

Setiap route dapat mendefinisikan metadata berikut:

config:

service
permission
skipAuth
public

Contoh route:

{
method: "GET",
url: "/api/attendance/session",
config: {
service: "ABSENSI",
permission: "attendance.session.view"
}
}

Middleware akan membaca config tersebut secara otomatis.

---

# 4. Eliminasi Duplikasi Middleware

Saat ini middleware dipasang pada:

global
/api group
module route

Refactor harus memastikan:

AuthMiddleware hanya dipasang satu kali secara global.

TenantResolverMiddleware hanya dipasang pada group /api.

Module tidak boleh lagi memasang auth atau tenant middleware sendiri.

Semua module hanya boleh menggunakan:

permission middleware

atau guard spesifik.

---

# 5. Standarisasi Public Endpoint

Whitelist public endpoint berbasis string prefix harus dihapus.

Sebagai pengganti digunakan route config:

config.public = true

Contoh:

{
method: "POST",
url: "/api/auth/login",
config: {
public: true
}
}

AuthMiddleware akan melewati endpoint tersebut.

---

# 6. Standarisasi Service Access

Service capability harus menjadi layer terpisah dari permission.

Contoh service:

CORE_PLATFORM
ABSENSI
KOPERASI
PPDB
RAPOR
REPORTING

Jika route memiliki config.service, maka middleware ServiceCapabilityMiddleware harus memverifikasi:

tenant memiliki capability tersebut.

---

# 7. Standarisasi Permission Check

PermissionMiddleware menggantikan kombinasi:

Authorize
RequireCapability

PermissionMiddleware membaca:

config.permission

dan memverifikasi capability user.

Contoh:

config.permission = "attendance.session.create"

---

# 8. Integrasi DataScope

DataScopeMiddleware tetap dipertahankan tetapi dipindahkan setelah permission check.

Flow:

permission valid → baru tentukan dataScope.

Ini mencegah query database yang tidak perlu.

---

# 9. Penghapusan Bypass Berbasis Prefix

Kode seperti berikut harus dihapus:

if (url.startsWith("/payment"))
bypass

Semua bypass harus menggunakan:

config.public

atau

config.skipAuth

---

# 10. Standarisasi Modul Self-Protecting

Modul seperti:

invoice
payment
webhook

tidak boleh lagi memasang middleware sendiri.

Semua modul harus melalui pipeline middleware platform.

Jika modul memerlukan pengecualian maka harus menggunakan:

config.public
config.skipAuth

---

# 11. Integrasi Capability Guard

CapabilityGuard tetap digunakan tetapi dipindahkan menjadi:

ServiceCapabilityMiddleware

Capability resolver tetap memakai:

TenantCapabilitiesResolver.

---

# 12. Refactor Strategy (Safe Migration)

Refactor dilakukan bertahap:

Step 1
Tambahkan middleware baru tanpa menghapus middleware lama.

Step 2
Tambahkan config.service dan config.permission pada route.

Step 3
Aktifkan ServiceCapabilityMiddleware.

Step 4
Aktifkan PermissionMiddleware.

Step 5
Hapus middleware duplikat dari module.

Step 6
Hapus whitelist prefix bypass.

---

# 13. Regression Protection

Selama refactor:

Tidak boleh mengubah:

endpoint URL
request body
response structure

Load test attendance harus tetap berjalan.

Semua endpoint existing harus tetap lulus test.

---

# 14. Target Akhir

Setelah refactor:

Semua endpoint akan melalui pipeline middleware yang konsisten.

Tidak ada lagi:

duplikasi auth
duplikasi tenant
whitelist path berbasis string

Platform siap untuk layanan tambahan:

PPDB
RAPOR
CBT
PERPUSTAKAAN
KEUANGAN

Blueprint ini hanya mendefinisikan arsitektur middleware.

Implementasi akan dilakukan setelah blueprint disetujui.
