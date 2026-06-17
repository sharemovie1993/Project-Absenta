Instruksi – Authorization Refactor Pre-Refactor Safeguard

Platform Absenta akan memasuki proses refactor authorization sesuai dokumen:

docs/architecture/AUTHORIZATION_REFACTOR_PLAN.md

Sebelum implementasi Phase 1 (Service Feature Guard), perlu dilakukan beberapa langkah safeguard untuk memastikan refactor tidak menyebabkan regression pada sistem yang sudah berjalan.

Tahap ini hanya menyiapkan baseline dan konfigurasi pendukung.

Tidak boleh ada perubahan behavior sistem production.

---

# Tujuan Safeguard

Langkah ini bertujuan untuk:

* membuat snapshot endpoint sebelum refactor
* mendefinisikan mapping feature module secara resmi
* menyiapkan strategi caching untuk entitlement resolver
* memastikan refactor Phase 1 berjalan aman dan terkontrol

---

# Task 1 – Route Baseline Snapshot

Buat snapshot seluruh endpoint backend saat ini.

Lokasi output:

docs/audit/route_baseline_snapshot.md

Dokumen harus berisi daftar endpoint dalam format:

METHOD
PATH
MODULE
PUBLIC / PROTECTED

Contoh:

GET /api/attendance/gerbang/tap → attendance → PROTECTED
POST /api/auth/login → auth → PUBLIC

Tujuan snapshot ini adalah sebagai referensi jika setelah refactor terdapat endpoint yang tidak dapat diakses.

Snapshot ini tidak boleh diubah selama refactor berlangsung.

---

# Task 2 – Service Feature Mapping

Buat konfigurasi mapping antara module backend dan service feature platform.

Lokasi file:

src/config/service-feature-map.ts

Contoh struktur:

export const ServiceFeatureMap = {
attendance: 'ABSENSI',
cooperative: 'KOPERASI',
reporting: 'REPORTING',
academic: 'CORE',
dashboard: 'CORE',
kesiswaan: 'CORE',
kurikulum: 'CORE',
document_center: 'CORE'
};

Mapping ini akan menjadi sumber kebenaran untuk ServiceFeatureGuard pada Phase 1.

Setiap module service harus memiliki mapping feature yang jelas.

---

# Task 3 – Tenant Entitlement Resolver Design

Siapkan struktur service untuk resolver entitlement tenant.

Lokasi:

src/modules/billing/services/tenant-entitlement.service.ts

Service ini belum perlu diintegrasikan ke pipeline.

Hanya siapkan interface dasar.

Contoh method:

resolveTenantFeatures(tenantId)

Output method:

['CORE','ABSENSI','KOPERASI']

Resolver harus membaca subscription aktif tenant dan mengagregasi Plan.features_json.

---

# Task 4 – Entitlement Cache Strategy

Resolver entitlement harus menggunakan caching agar tidak melakukan query database pada setiap request.

Implementasi caching dapat menggunakan:

* Redis cache
* atau in-memory LRU cache

TTL cache yang direkomendasikan:

60 detik

Contoh cache key:

tenant:features:{tenantId}

Cache harus diinvalidate ketika subscription tenant berubah.

---

# Task 5 – Public Endpoint Definition

Identifikasi endpoint yang harus dilewati oleh ServiceFeatureGuard.

Contoh endpoint publik:

auth login/register
payment webhook
invoice public link
document download token

Tambahkan flag standar pada route configuration:

routeOptions.config.public = true

Flag ini akan digunakan pada ServiceFeatureGuard Phase 1.

---

# Task 6 – Documentation

Dokumentasikan hasil safeguard pada file:

docs/architecture/AUTHORIZATION_PRE_REFACTOR_BASELINE.md

Dokumen harus berisi:

* route baseline snapshot
* service feature mapping
* tenant entitlement resolver design
* caching strategy
* public endpoint definition

---

# Output

Setelah semua task selesai, sistem belum mengalami perubahan behavior.

Tujuan tahap ini hanya memastikan bahwa implementasi Phase 1 (Service Feature Guard) dapat dilakukan secara aman tanpa merusak endpoint existing.
