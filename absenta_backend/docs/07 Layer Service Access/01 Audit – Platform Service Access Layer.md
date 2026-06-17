Instruksi Audit – Platform Service Access Layer (Multi-Service Governance)

Platform Absenta saat ini telah berkembang dari single-product (Absensi) menjadi platform multi-service yang menyediakan berbagai layanan seperti:

* Absensi
* Koperasi
* Akademik
* Kesiswaan
* Hubin
* Sarpras
* Tata Usaha
* Document Center
* Billing SaaS

Tenant yang baru registrasi saat ini mendapatkan paket default:

CORE_PLATFORM

yang berisi fitur dasar:

* Academic
* Data Master
* Billing
* Settings
* Service Catalog (halaman order layanan)

Setelah itu tenant dapat melakukan upgrade atau memesan layanan tambahan seperti:

ABSENSI
KOPERASI
dan layanan lain yang akan datang.

Karena itu sebelum melakukan refactor RBAC, perlu dilakukan audit untuk memastikan bahwa sistem memiliki **layer kontrol akses layanan (Service Access Layer)** yang benar.

Audit ini bertujuan memetakan bagaimana layanan diaktifkan atau dibatasi untuk tenant.

Tidak boleh ada refactor pada tahap ini.

Hanya audit dan laporan.

---

TUJUAN AUDIT

Audit ini harus menjawab pertanyaan berikut:

1. Bagaimana tenant mendapatkan layanan saat pertama kali registrasi
2. Bagaimana layanan disimpan dalam subscription atau plan
3. Bagaimana backend menentukan apakah tenant boleh mengakses suatu service
4. Apakah endpoint backend melakukan pengecekan feature/service
5. Apakah menu frontend hanya melakukan UI gating atau juga backend enforcement
6. Apakah ada endpoint service yang bisa diakses walaupun tenant belum membeli layanan

Output audit ini akan menjadi dasar untuk merancang governance platform service.

---

LANGKAH 1 – Audit Default Tenant Provisioning

Periksa proses saat tenant berhasil registrasi.

Lokasi yang perlu diperiksa:

modules/tenant
modules/auth
modules/billing
modules/subscription
modules/plans
seed.ts

Temukan proses berikut:

* pembuatan tenant baru
* plan default yang diberikan
* subscription default
* feature default

Periksa apakah tenant baru otomatis mendapatkan:

CORE_PLATFORM

dan identifikasi data berikut:

plan_id
subscription_id
features_json
absensi_mode
max_user

Laporkan bagaimana feature disimpan dan diakses oleh sistem.

---

LANGKAH 2 – Audit Plan Feature Model

Periksa model plan pada database.

Lokasi kemungkinan:

schema.prisma
modules/billing
modules/plans

Identifikasi field berikut:

features
features_json
plan name
billing_period
absensi_mode

Contoh yang mungkin ditemukan:

features_json: ['CORE','ABSENSI']

atau

features_json: ['CORE','KOPERASI']

Audit harus menjelaskan:

1. bagaimana feature disimpan
2. bagaimana feature diakses saat runtime
3. apakah feature digunakan oleh backend authorization

---

LANGKAH 3 – Audit Service Modules

Identifikasi modul backend yang mewakili service platform.

Contoh:

modules/attendance
modules/cooperative
modules/academic
modules/kesiswaan
modules/hubin
modules/sarpras
modules/tu
modules/documents

Untuk setiap modul, identifikasi:

* apakah ada guard yang memeriksa feature tenant
* apakah endpoint bisa dipanggil tanpa memeriksa feature

Contoh yang harus dicari:

tenant.features.includes('ABSENSI')

atau

requireFeature('ABSENSI')

atau

CapabilityGuard('ABSENSI')

Jika tidak ada pengecekan feature, tandai sebagai:

SERVICE ACCESS NOT GUARDED

---

LANGKAH 4 – Audit Menu Feature Gating

Periksa struktur menu pada seed.ts.

Menu memiliki field:

required_features
required_capability

Contoh:

required_features: ['ABSENSI']

Audit harus menjelaskan:

1. apakah menu hanya UI gating
2. apakah backend juga melakukan pengecekan feature
3. apakah user bisa langsung mengakses endpoint tanpa menu

Jika backend tidak melakukan enforcement, tandai sebagai:

UI ONLY ACCESS CONTROL

---

LANGKAH 5 – Audit Middleware Pipeline

Backend Absenta telah melalui proses hardening middleware.

Pipeline saat ini adalah:

Request
↓
Logging
↓
AuthMiddleware
↓
TenantMiddleware
↓
CapabilityGuard
↓
Route Guards
↓
Controller

Audit harus memverifikasi apakah terdapat middleware tambahan untuk:

Service Feature Access

Misalnya:

FeatureGuard
ServiceGuard
PlanGuard

Jika tidak ada, laporkan bahwa platform saat ini **belum memiliki service access enforcement layer di backend**.

---

LANGKAH 6 – Audit Endpoint Exposure

Scan seluruh route backend.

Lokasi:

modules/*/routes
modules/*/controllers

Identifikasi endpoint yang berhubungan dengan service berikut:

Attendance endpoints
Cooperative endpoints
Academic endpoints
Kesiswaan endpoints

Untuk setiap endpoint periksa apakah terdapat:

CapabilityGuard
AuthorizeGuard
FeatureGuard

Jika endpoint tidak memiliki pengecekan feature, tandai sebagai:

SERVICE ENDPOINT NOT FEATURE PROTECTED

---

OUTPUT LAPORAN

Hasil audit harus disimpan dalam dokumen:

docs/audit/01_platform_service_access_audit.md

Dokumen harus berisi:

1. Tenant provisioning model
2. Plan feature model
3. Service modules mapping
4. Feature enforcement layer
5. Menu gating vs backend enforcement
6. Endpoint exposure analysis
7. Risiko akses layanan tanpa subscription

---

TUJUAN AKHIR AUDIT

Audit ini akan menghasilkan peta lengkap tentang bagaimana layanan platform dikontrol.

Setelah laporan selesai, tahap berikutnya adalah:

Platform Service Governance Design

yang akan menentukan:

1. service feature guard layer
2. integrasi feature dengan middleware
3. integrasi feature dengan RBAC capability
4. kebijakan akses layanan tenant
