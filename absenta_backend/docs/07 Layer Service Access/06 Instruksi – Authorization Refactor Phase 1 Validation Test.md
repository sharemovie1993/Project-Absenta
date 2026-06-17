Instruksi – Authorization Refactor Phase 1 Validation Test

Platform Absenta telah menyelesaikan Phase 1 Authorization Refactor:

Service Feature Guard Implementation.

Guard telah diintegrasikan pada pipeline `/api` protected routes sebelum CapabilityGuard.

Tujuan tahap ini adalah melakukan validasi menyeluruh untuk memastikan bahwa ServiceFeatureGuard bekerja dengan benar dan tidak menyebabkan regression pada sistem.

Tahap ini hanya melakukan pengujian dan verifikasi.

Tidak ada perubahan kode yang dilakukan kecuali jika ditemukan bug.

---

# Tujuan Validation Test

Pengujian ini bertujuan memastikan:

* service feature gating bekerja dengan benar
* module service hanya dapat diakses oleh tenant yang memiliki entitlement
* endpoint publik tidak terblokir
* API contract tidak berubah
* module CORE tetap dapat diakses oleh tenant normal
* tidak ada module yang terblokir secara tidak sengaja

---

# Task 1 – Feature Gating Validation

Uji setiap module service dengan tenant yang memiliki dan tidak memiliki feature layanan.

Contoh skenario pengujian:

Tenant tanpa ABSENSI mencoba akses:

GET /api/attendance/gerbang/present

Expected result:

HTTP 403
SERVICE_FEATURE_NOT_ENABLED

Tenant dengan ABSENSI mencoba endpoint yang sama.

Expected result:

SUCCESS

Lakukan pengujian serupa untuk:

cooperative module
reporting module

---

# Task 2 – CORE Module Validation

Pastikan module yang termasuk CORE tetap dapat diakses oleh tenant normal.

Contoh endpoint:

GET /api/dashboard/overview
GET /api/academic/siswa
GET /api/users

Expected result:

SUCCESS

---

# Task 3 – Public Endpoint Validation

Pastikan endpoint publik tidak terkena ServiceFeatureGuard.

Contoh endpoint publik:

POST /api/auth/login
POST /api/auth/register
POST /api/webhooks/payment/:gateway
GET /api/invoice/public/:token

Expected result:

SUCCESS

ServiceFeatureGuard harus melewati endpoint yang memiliki:

config.public = true

---

# Task 4 – Subscription Edge Case

Uji perilaku guard pada tenant dengan kondisi subscription berbeda.

Case:

ACTIVE
TRIAL
EXPIRED
CANCELLED

Periksa apakah feature guard tetap bekerja dengan benar.

Catat behavior yang ditemukan untuk persiapan Phase 2 (Subscription Guard Hardening).

---

# Task 5 – Module Coverage Validation

Periksa seluruh module backend untuk memastikan semua module memiliki mapping feature yang benar.

Gunakan:

src/config/service-feature-map.ts

Pastikan tidak ada module service yang:

* tidak memiliki mapping feature
* menggunakan mapping feature yang salah

Jika ditemukan module tanpa mapping maka default CORE harus berlaku.

---

# Task 6 – Route Baseline Comparison

Bandingkan hasil akses endpoint dengan snapshot baseline:

docs/audit/route_baseline_snapshot.md

Tujuan perbandingan:

* memastikan endpoint tidak hilang
* memastikan endpoint tidak berubah status public/protected

---

# Task 7 – Observability Check

Pastikan error berikut muncul dengan benar saat service tidak diaktifkan:

HTTP 403

Payload:

{
"error": "SERVICE_FEATURE_NOT_ENABLED",
"message": "Service not enabled for this tenant"
}

Tambahkan logging untuk event ini jika belum tersedia.

---

# Output

Simpan laporan hasil validasi pada:

docs/audit/AUTHORIZATION_PHASE1_VALIDATION_REPORT.md

Laporan harus berisi:

* hasil feature gating test
* hasil CORE module validation
* hasil public endpoint validation
* hasil module coverage validation
* hasil route baseline comparison
* daftar issue jika ditemukan

Jika tidak ditemukan issue, maka Phase 1 dianggap stabil dan platform dapat melanjutkan ke Phase 2:

Subscription Guard Hardening.
