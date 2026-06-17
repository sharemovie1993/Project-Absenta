Instruksi – Feature State Audit

Tujuan audit ini adalah memverifikasi bahwa FeatureStateResolver bekerja konsisten dengan data subscription dan plan sehingga state layanan (LOCKED, TRIAL, ACTIVE, EXPIRED) dapat dihitung dengan benar.

Audit ini tidak boleh mengubah kode atau database.
Hanya melakukan observasi dan menghasilkan laporan.

---

# STEP 1 – Audit Subscription Schema

Periksa struktur tabel subscription.

Pastikan tabel subscription memiliki kolom berikut:

tenant_id
feature_code atau service_code
status
trial_start
trial_end atau end_date

Jika trial_end tidak ada, catat sebagai GAP.

Tujuan audit ini adalah memastikan bahwa data yang diperlukan untuk menentukan FeatureState tersedia.

---

# STEP 2 – Audit Plan Features Mapping

Periksa tabel Plan atau konfigurasi plan.

Pastikan setiap plan memiliki mapping fitur yang jelas.

Contoh:

Plan: ABSENSI_BASIC
features_json:

ABSENSI

Plan: KOPERASI_BASIC
features_json:

KOPERASI

Verifikasi bahwa field features_json benar-benar digunakan oleh TenantEntitlementResolver.

---

# STEP 3 – Audit Subscription Status Values

Periksa semua nilai yang mungkin muncul pada kolom status di tabel subscription.

Contoh nilai yang mungkin ada:

ACTIVE
TRIAL
EXPIRED
CANCELLED
PENDING

Buat daftar semua nilai yang ditemukan.

Pastikan FeatureStateResolver hanya memproses nilai yang valid.

---

# STEP 4 – Audit FeatureStateResolver Logic

Buka file:

src/services/feature-state-resolver.service.ts

Verifikasi bahwa resolver melakukan langkah berikut:

1. mencari subscription berdasarkan tenant_id dan feature_code
2. memeriksa status subscription
3. memeriksa trial_end atau end_date
4. mengembalikan state:

LOCKED
TRIAL
ACTIVE
EXPIRED

Pastikan tidak ada kondisi yang dapat menghasilkan state ambigu.

Contoh kondisi yang harus dicegah:

subscription.status = ACTIVE tetapi end_date sudah lewat.

Jika ditemukan kondisi ini, catat sebagai potensi bug.

---

# STEP 5 – Audit ServiceFeatureGuard Integration

Buka file:

serviceFeatureGuard

Pastikan guard menggunakan FeatureStateResolver.

Verifikasi logic berikut:

LOCKED → allow GET, block mutation
TRIAL → allow all
ACTIVE → allow all
EXPIRED → allow GET, block mutation

Mutation berarti:

POST
PUT
PATCH
DELETE

---

# STEP 6 – Audit SidebarRenderingService

Buka file:

SidebarRenderingService

Pastikan setiap menu yang memiliki required_feature akan memanggil FeatureStateResolver.

Verifikasi bahwa sidebar response mengandung field:

feature_state

Contoh response:

{
label: "Absensi",
feature_state: "TRIAL"
}

---

# STEP 7 – Data Consistency Test

Simulasikan kondisi berikut:

Tenant tanpa subscription untuk ABSENSI
Expected state: LOCKED

Tenant dengan subscription status TRIAL
Expected state: TRIAL

Tenant dengan subscription status ACTIVE
Expected state: ACTIVE

Tenant dengan subscription end_date < now
Expected state: EXPIRED

Catat hasil setiap simulasi.

---

# STEP 8 – Audit Feature Propagation

Jika parent menu memiliki feature_state tertentu, verifikasi bahwa child menu mewarisi state tersebut.

Contoh:

Absensi (TRIAL)

Scan
Rekap

Semua child harus memiliki feature_state yang sama.

---

# STEP 9 – Audit API Response

Panggil endpoint:

GET /api/menu/sidebar

Verifikasi bahwa setiap menu memiliki field:

feature_state

Nilai harus salah satu dari:

LOCKED
TRIAL
ACTIVE
EXPIRED

---

# STEP 10 – Output Audit Report

Buat laporan:

FEATURE_STATE_AUDIT_REPORT.md

Isi laporan harus mencakup:

Subscription schema review
Plan feature mapping review
Resolver logic verification
Guard integration verification
Sidebar integration verification
Data consistency test results
Daftar potensi GAP

Jangan melakukan perubahan kode pada tahap audit ini.
