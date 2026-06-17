Instruksi Implementasi – Tenant Billing Capability Fix

Tujuan instruksi ini adalah memperbaiki flow checkout tenant agar ADMIN sekolah dapat membeli layanan tanpa melanggar domain RBAC antara PLATFORM dan TENANT.

Masalah yang ditemukan:

Halaman:

```
/billing/checkout
```

ditolak karena membutuhkan capability:

```
billing.subscriptions.create
```

Capability ini merupakan capability PLATFORM dan tidak dimiliki oleh ADMIN tenant.

---

1. Buat Capability Tenant Billing

Tambahkan capability baru pada Action Catalog:

```
billing.my.subscription.create
billing.my.subscription.upgrade
billing.my.subscription.view
billing.my.invoice.view
billing.my.invoice.pay
```

Capability ini merupakan domain TENANT.

---

2. Perbarui Endpoint Checkout

Endpoint tenant checkout harus menggunakan capability:

```
billing.my.subscription.create
```

bukan:

```
billing.subscriptions.create
```

Periksa endpoint berikut:

```
POST /api/billing/checkout
POST /api/subscriptions
```

Guard harus diganti.

---

3. Perbarui RBAC Baseline

Role ADMIN tenant harus memiliki capability berikut:

```
billing.my.subscription.view
billing.my.subscription.create
billing.my.subscription.upgrade
billing.my.invoice.view
billing.my.invoice.pay
```

Tambahkan pada:

```
seed_policies.ts
```

---

4. Verifikasi Flow Upgrade

Login sebagai:

```
ADMIN tenant
```

Lakukan flow berikut:

```
Langganan Saya
↓
Upgrade Plan
↓
Checkout
↓
Invoice dibuat
```

Halaman berikut harus bisa diakses tanpa error:

```
/billing/checkout
```

---

5. Verifikasi Build

Jalankan:

```
npm run build
npm run test
```

Backend dan frontend harus berhasil tanpa error.

---

6. Laporan Implementasi

TRAE (ANDA) harus menghasilkan laporan:

```
TENANT_BILLING_CAPABILITY_FIX.md
```

yang menjelaskan:

* capability baru yang dibuat
* perubahan guard endpoint
* update RBAC baseline
* hasil pengujian flow checkout tenant.
