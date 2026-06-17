Instruksi Implementasi – Frontend Endpoint Contract Audit (Tenant Application)

Tujuan audit ini adalah memastikan seluruh halaman tenant application hanya memanggil endpoint domain TENANT dan tidak lagi memanggil endpoint PLATFORM setelah migrasi RBAC.

Masalah yang ditemukan:

Frontend tenant masih memanggil endpoint yang membutuhkan capability PLATFORM sehingga menyebabkan error 403.

Contoh:

```
/api/tenants/:id
/api/billing/subscriptions/active
/api/notifications/status
/api/attendance/notify/feed
```

Endpoint tersebut tidak boleh dipanggil oleh tenant dashboard.

---

1. Scan Seluruh Frontend API Calls

TRAE (ANDA) diminta memindai seluruh frontend untuk menemukan semua endpoint API yang dipanggil.

Scan folder:

```
src/pages
src/components
src/hooks
src/services
src/stores
src/utils/api
```

Cari pola:

```
axios.get
axios.post
api.get
api.post
fetch
```

Kumpulkan seluruh endpoint yang dipanggil.

---

2. Generate Endpoint Usage Map

Script audit harus menghasilkan daftar endpoint yang dipakai frontend.

Contoh output:

```
GET /api/auth/me
GET /api/system/config
GET /api/me/tenant
GET /api/me/subscription
GET /api/attendance/notify/feed
GET /api/billing/subscriptions/active
```

Hasil ini harus disimpan dalam file:

```
FRONTEND_ENDPOINT_USAGE_MAP.md
```

---

3. Klasifikasi Endpoint

Setiap endpoint harus diklasifikasikan:

```
TENANT_SAFE
PLATFORM_ONLY
REVIEW_REQUIRED
```

Contoh:

TENANT_SAFE

```
/api/auth/me
/api/me/tenant
/api/me/subscription
/api/dashboard/overview
```

PLATFORM_ONLY

```
/api/tenants/:id
/api/billing/subscriptions/active
/api/platform/*
/api/superadmin/*
```

REVIEW_REQUIRED

```
/api/attendance/notify/feed
/api/notifications/*
```

---

4. Identifikasi Frontend Platform Leaks

Jika tenant frontend memanggil endpoint PLATFORM_ONLY maka kategorikan sebagai:

```
FRONTEND_PLATFORM_LEAK
```

Contoh:

```
src/pages/billing/MySubscription.tsx
→ memanggil /api/billing/subscriptions/active
```

---

5. Perbaiki Endpoint yang Tidak Sesuai

Jika ditemukan endpoint PLATFORM_ONLY maka frontend harus diganti menggunakan endpoint tenant-safe.

Contoh:

Sebelum:

```
GET /api/billing/subscriptions/active
```

Sesudah:

```
GET /api/me/subscription
```

Contoh lain:

Sebelum:

```
GET /api/tenants/:id
```

Sesudah:

```
GET /api/me/tenant
```

---

6. Verifikasi Role Compatibility

Pastikan halaman berikut dapat diakses oleh role:

```
ADMIN
GURU
SISWA
```

tanpa memanggil endpoint yang memerlukan capability platform.

---

7. Laporan Audit

TRAE (ANDA) harus menghasilkan laporan:

```
FRONTEND_ENDPOINT_CONTRACT_AUDIT.md
```

Isi laporan:

Total endpoint yang dipakai frontend

Jumlah endpoint TENANT_SAFE

Jumlah PLATFORM_ONLY

Jumlah FRONTEND_PLATFORM_LEAK

Daftar file frontend yang memanggil endpoint platform.

---

8. Verifikasi Sistem

Setelah refactor selesai lakukan pengujian:

Login sebagai:

```
ADMIN
GURU
SISWA
```

Pastikan:

```
tidak ada lagi 403 dari endpoint bootstrap atau halaman tenant
```

Lakukan juga:

```
npm run build
npm run test
```

---

Tujuan akhir audit ini adalah memastikan tenant application hanya menggunakan endpoint yang sesuai dengan domain TENANT dan sepenuhnya kompatibel dengan sistem RBAC capability yang baru.
