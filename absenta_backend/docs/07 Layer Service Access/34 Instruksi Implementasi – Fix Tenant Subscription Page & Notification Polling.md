Instruksi Implementasi – Fix Tenant Subscription Page & Notification Polling

Tujuan instruksi ini adalah menghilangkan error 403 pada tenant dashboard yang masih muncul setelah migrasi RBAC dan refactor endpoint contract.

Masalah yang ditemukan:

1. Halaman `/billing/my-subscription` masih menggunakan capability lama `billing.subscriptions.view.active`.
2. Notification polling (`/attendance/notify/feed`) tetap berjalan walaupun role tidak memiliki capability.

---

1. Perbaikan Page Guard – My Subscription

File yang perlu diperiksa:

```
src/pages/billing/MySubscriptionPage.tsx
```

atau route guard terkait.

Capability lama:

```
billing.subscriptions.view.active
```

harus dihapus.

Endpoint yang digunakan sekarang adalah:

```
GET /api/me/subscription
```

yang merupakan tenant self-resource.

Guard capability harus diganti menjadi:

```
billing.subscription.view.my
```

atau jika endpoint sudah aman:

hapus page capability guard sama sekali.

---

2. Pastikan Endpoint Backend Sesuai

Endpoint yang digunakan frontend harus:

```
GET /api/me/subscription
```

bukan:

```
/api/billing/subscriptions/active
```

Endpoint harus menggunakan:

```
req.tenant.id
```

untuk mengambil subscription tenant.

---

3. Perbaikan Notification Polling

File yang perlu diperiksa:

```
src/hooks/useNotifications.ts
```

Polling saat ini memanggil:

```
GET /api/attendance/notify/feed
```

tanpa memeriksa capability user.

Tambahkan capability check sebelum polling dimulai.

Contoh:

```
if (!userCapabilities.includes("attendance.notify.feed")) {
    return;
}
```

atau gunakan menu capability mapping.

---

4. Fallback Handling Polling

Jika endpoint mengembalikan:

```
403
```

polling harus dihentikan.

Contoh:

```
if (error.response?.status === 403) {
    stopPolling();
}
```

agar console tidak dipenuhi error.

---

5. Verifikasi Flow Subscription Tenant

Setelah perbaikan selesai lakukan pengujian:

Login sebagai:

```
ADMIN tenant
```

Pastikan halaman berikut dapat diakses tanpa 403:

```
Dashboard
Layanan
Langganan Saya
Upgrade Plan
```

Endpoint yang harus berhasil:

```
GET /api/me/subscription
GET /api/me/tenant
```

---

6. Verifikasi Build

Jalankan:

```
npm run build
npm run test
```

Backend dan frontend harus berhasil build tanpa error.

---

7. Laporan Implementasi

TRAE (ANDA) harus menghasilkan laporan:

```
TENANT_SUBSCRIPTION_PAGE_FIX.md
```

Isi laporan:

file yang diperbaiki

perubahan capability guard

perbaikan notification polling

hasil verifikasi login ADMIN tenant tanpa error 403.
