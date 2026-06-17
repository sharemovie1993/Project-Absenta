Instruksi – Authorization Refactor Phase 1
Service Feature Guard Implementation

Platform Absenta telah menyelesaikan tahap:

* Authorization Architecture Blueprint
* Authorization Refactor Implementation Plan
* Authorization Pre-Refactor Safeguard

Baseline sistem telah dikunci dan tidak boleh terjadi perubahan perilaku endpoint yang tidak berkaitan dengan service access.

Tahap ini mengimplementasikan Service Feature Guard sesuai blueprint.

Tujuan fase ini adalah memastikan bahwa module service hanya dapat diakses jika tenant memiliki entitlement layanan yang sesuai.

Contoh:

Tenant tanpa feature ABSENSI tidak boleh mengakses module attendance.

Tenant tanpa feature KOPERASI tidak boleh mengakses module cooperative.

---

# Tujuan Phase 1

1. Mengimplementasikan ServiceFeatureGuard middleware
2. Mengintegrasikan TenantEntitlementResolver
3. Menggunakan service-feature-map sebagai sumber kebenaran
4. Mengintegrasikan guard pada pipeline `/api` protected routes
5. Memastikan endpoint publik tidak terkena feature guard
6. Tidak mengubah API contract existing

---

# Task 1 – Implement ServiceFeatureGuard

Buat middleware:

src/infra/guards/service-feature.guard.ts

Middleware ini bertanggung jawab untuk memverifikasi bahwa tenant memiliki feature layanan yang sesuai dengan module yang diakses.

Pseudo flow:

1. Ambil module name dari route context.
2. Cari feature requirement dari service-feature-map.
3. Jika module tidak memiliki mapping feature → anggap CORE.
4. Gunakan TenantEntitlementResolver untuk mendapatkan feature tenant.
5. Jika tenant tidak memiliki feature yang dibutuhkan → return 403.

Contoh logika:

* module attendance → membutuhkan feature ABSENSI
* module cooperative → membutuhkan feature KOPERASI
* module academic → membutuhkan feature CORE

Jika tenant memiliki feature tersebut maka request dilanjutkan.

Jika tidak → tolak dengan error:

HTTP 403
SERVICE_FEATURE_NOT_ENABLED

---

# Task 2 – Integrasi TenantEntitlementResolver

Gunakan resolver yang sudah disiapkan pada fase safeguard.

Lokasi:

src/modules/billing/services/tenant-entitlement.service.ts

Method utama:

resolveTenantFeatures(tenantId)

Output:

['CORE','ABSENSI','KOPERASI']

Resolver harus menggunakan cache key:

tenant:features:{tenantId}

TTL cache:

60 seconds

Jika cache ada → gunakan cache
Jika tidak → query subscription dan plan.

---

# Task 3 – Integrasi Service Feature Mapping

Gunakan file mapping:

src/config/service-feature-map.ts

Contoh:

attendance → ABSENSI
cooperative → KOPERASI
reporting → REPORTING
academic → CORE

Jika module tidak ditemukan di mapping maka default:

CORE

---

# Task 4 – Integrasi Guard pada Middleware Pipeline

Perbarui pipeline `/api` protected routes menjadi:

Request
→ Logging Middleware
→ Auth Middleware
→ Tenant Resolver
→ Tenant Status Guard
→ Subscription Guard
→ ServiceFeatureGuard
→ CapabilityGuard
→ Controller

ServiceFeatureGuard harus dijalankan sebelum CapabilityGuard.

---

# Task 5 – Bypass Endpoint Publik

Endpoint yang memiliki flag berikut harus melewati ServiceFeatureGuard:

config.public = true

Contoh endpoint publik:

Auth login/register
Payment webhook
Invoice public link
Document download token

Guard harus langsung memanggil next() untuk endpoint tersebut.

---

# Task 6 – Error Handling

Jika tenant mencoba mengakses service tanpa entitlement:

Response:

HTTP 403

Payload:

{
"error": "SERVICE_FEATURE_NOT_ENABLED",
"message": "Service not enabled for this tenant"
}

Tambahkan logging untuk observability.

---

# Task 7 – Verification

Setelah implementasi selesai lakukan pengujian berikut:

Case 1
Tenant tanpa ABSENSI mencoba akses `/api/attendance/...`
Expected: 403 SERVICE_FEATURE_NOT_ENABLED

Case 2
Tenant dengan ABSENSI mencoba akses attendance
Expected: SUCCESS

Case 3
Tenant tanpa KOPERASI mencoba akses `/api/cooperative/...`
Expected: 403

Case 4
Tenant expired tetapi akses billing endpoint
Expected: allowed (bypass subscription guard)

Case 5
Endpoint publik seperti `/api/auth/login`
Expected: bypass feature guard

---

# Refactor Safety Rules

Selama Phase 1 berlangsung:

* Tidak boleh mengubah endpoint path.
* Tidak boleh mengubah response structure endpoint.
* Tidak boleh memecah module atau route.
* Tidak boleh mengubah Action Catalog.

Perubahan hanya pada enforcement service feature layer.

---

# Output

Setelah Phase 1 selesai:

* Service access governance aktif.
* Tenant hanya dapat mengakses layanan yang dimiliki.
* Platform Absenta siap menjalankan model multi-service SaaS secara aman.

Simpan laporan implementasi pada:

docs/architecture/AUTHORIZATION_PHASE1_IMPLEMENTATION.md
