Instruksi – Authorization Refactor Phase 2
Subscription Guard Hardening

Platform Absenta telah menyelesaikan Phase 1 Authorization Refactor:

Service Feature Guard Implementation.

Service governance sudah berjalan stabil dan telah divalidasi.

Phase 2 bertujuan memperkuat Subscription Guard agar tenant yang tidak memiliki subscription core yang valid tidak dapat mengakses platform core.

Implementasi harus mengikuti blueprint authorization architecture yang telah disepakati.

Tidak boleh ada perubahan API contract existing.

---

# Tujuan Phase 2

1. Menstandarkan kebijakan status subscription.
2. Memastikan tenant tanpa subscription valid tidak dapat mengakses platform core.
3. Menjaga akses endpoint billing tetap tersedia untuk tenant yang subscription-nya tidak valid.
4. Menyelaraskan Subscription Guard dengan ServiceFeatureGuard yang telah diimplementasikan.

---

# Task 1 – Define Subscription Status Policy

Definisikan status subscription yang dianggap valid untuk mengakses CORE platform.

Status yang diizinkan:

ACTIVE
TRIAL

Status yang harus diblok:

EXPIRED
CANCELLED
SUSPENDED
PAST_DUE

Jika tenant memiliki subscription core dengan status yang tidak valid maka request harus ditolak oleh Subscription Guard.

---

# Task 2 – Update Subscription Guard Logic

Perbarui implementasi:

subscriptionGuard

Lokasi biasanya berada pada:

TenantMiddleware
atau
src/infra/guards/subscription.guard.ts

Logika guard harus melakukan:

1. mengambil subscription core tenant.
2. memeriksa status subscription.
3. jika status tidak valid maka menolak request dengan HTTP 403.

Error response:

{
"error": "SUBSCRIPTION_NOT_ACTIVE",
"message": "Tenant subscription is not active"
}

---

# Task 3 – Billing Endpoint Whitelist

Beberapa endpoint harus tetap dapat diakses walaupun subscription tidak valid.

Whitelist endpoint berikut:

billing module
subscription management
payment flow
payment webhook
invoice public link

Endpoint ini harus dapat dilewati oleh Subscription Guard.

Contoh:

/api/billing/*
/api/payment/*
/api/subscriptions/*

Implementasi whitelist dapat menggunakan:

routeOptions.config.billing = true

Subscription Guard harus melewati endpoint dengan flag tersebut.

---

# Task 4 – Tenant Status Integration

Subscription Guard harus tetap menghormati Tenant Status Guard.

Urutan pipeline tetap:

Auth Middleware
→ Tenant Resolver
→ Tenant Status Guard
→ Subscription Guard
→ ServiceFeatureGuard
→ CapabilityGuard

Jika tenant status:

DELETED
SUSPENDED

maka request harus ditolak lebih awal oleh Tenant Status Guard.

---

# Task 5 – Observability

Tambahkan logging event ketika Subscription Guard menolak request.

Event name:

SUBSCRIPTION_NOT_ACTIVE

Log harus mencatat:

tenantId
subscriptionStatus
endpoint
timestamp

Tujuan logging adalah membantu monitoring governance subscription.

---

# Task 6 – Verification

Lakukan pengujian berikut setelah implementasi selesai.

Case 1
Tenant dengan subscription ACTIVE mencoba akses dashboard.

Expected result: SUCCESS

Case 2
Tenant dengan subscription TRIAL mencoba akses dashboard.

Expected result: SUCCESS

Case 3
Tenant dengan subscription EXPIRED mencoba akses dashboard.

Expected result: 403 SUBSCRIPTION_NOT_ACTIVE

Case 4
Tenant dengan subscription EXPIRED mencoba endpoint billing.

Expected result: SUCCESS

Case 5
Payment webhook masuk ketika tenant subscription expired.

Expected result: SUCCESS

---

# Refactor Safety Rules

Selama Phase 2 berlangsung:

* Tidak boleh mengubah API endpoint existing.
* Tidak boleh mengubah response structure endpoint.
* Tidak boleh memecah module atau route.
* Tidak boleh mengubah logic ServiceFeatureGuard.

Perubahan hanya pada enforcement subscription policy.

---

# Output

Setelah Phase 2 selesai:

* Tenant tanpa subscription valid tidak dapat mengakses platform core.
* Tenant masih dapat melakukan pembayaran atau renewal subscription.
* Governance subscription platform menjadi konsisten.

Simpan laporan implementasi pada:

docs/architecture/AUTHORIZATION_PHASE2_IMPLEMENTATION.md
