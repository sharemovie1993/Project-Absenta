Instruksi Implementasi – Fix Tripay Simulator Route Setelah RBAC Refactor

Masalah yang ditemukan:

Halaman:

/billing/tripay-simulator

mengirim request ke endpoint:

/api/payments/test/*

Namun setelah refactor RBAC dan pemisahan Platform Console vs Tenant Application, endpoint simulator tidak lagi tersedia pada path tersebut sehingga server mengembalikan:

404 Not Found.

---

1. Verifikasi Mount Router Backend

Periksa file berikut:

src/modules/payment/routes/test.routes.ts

Pastikan route:

POST /test/simulate/:gateway
GET /test/tripay/health
GET /test/scenarios

masih ada.

Kemudian periksa di mana router tersebut dimount pada server.

Contoh:

```ts
app.use("/api/platform/payments", testRoutes)
```

---

2. Sesuaikan Endpoint Frontend

Jika backend sekarang menggunakan prefix platform:

```text
/api/platform/payments
```

maka frontend harus memanggil:

POST /api/platform/payments/test/simulate/tripay

bukan:

POST /api/payments/test/simulate/tripay

---

3. Perbaiki API Client Simulator

File:

src/api/tripaySimulator.api.ts

ubah endpoint menjadi sesuai domain platform.

Contoh:

```ts
api.post("/platform/payments/test/simulate/tripay")
api.get("/platform/payments/test/tripay/health")
api.get("/platform/payments/test/scenarios")
```

---

4. Pastikan Capability Platform

Endpoint simulator harus menggunakan capability:

payments.test.simulate

yang hanya dimiliki oleh role:

SUPERADMIN

---

5. Verifikasi

Login sebagai:

SUPERADMIN

Buka halaman:

/billing/tripay-simulator

Klik:

Simulate Success

Pastikan response berhasil dan tidak ada error 404.

---

6. Verifikasi Build

Jalankan:

npm run build
npm run test

Backend dan frontend harus berhasil build.

---

7. Laporan Implementasi

TRAE (ANDA) harus menghasilkan laporan:

TRIPAY_SIMULATOR_ROUTE_FIX.md

yang menjelaskan:

* perubahan route simulator
* endpoint frontend yang diperbaiki
* hasil pengujian simulator.
