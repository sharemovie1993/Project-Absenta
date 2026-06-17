Instruksi Implementasi – Fix Tripay Simulator Gateway Parameter

Masalah yang ditemukan pada halaman:

/billing/tripay-simulator

Frontend mengirim request:

POST /api/payments/test/simulate/TRIPAY

Server mengembalikan:

404 Not Found

Backend route yang tersedia:

POST /api/payments/test/simulate/:gateway

Gateway parameter pada backend menggunakan lowercase:

tripay

---

1. Perbaiki Gateway Parameter di Frontend

File:

src/api/tripaySimulator.api.ts

Cari request berikut:

```ts
api.post("/payments/test/simulate/TRIPAY")
```

ubah menjadi:

```ts
api.post("/payments/test/simulate/tripay")
```

atau lebih aman:

```ts
api.post(`/payments/test/simulate/${gateway.toLowerCase()}`)
```

---

2. Periksa Semua Penggunaan Gateway

Scan frontend untuk memastikan tidak ada penggunaan:

TRIPAY

yang dikirim ke API.

Semua gateway harus dikirim dalam format:

tripay

---

3. Periksa Health Endpoint

Endpoint berikut juga harus menggunakan lowercase:

GET /api/payments/test/tripay/health

bukan:

GET /api/payments/test/TRIPAY/health

---

4. Verifikasi

Login sebagai:

SUPERADMIN

Buka halaman:

/billing/tripay-simulator

Klik:

Simulate Success

Pastikan response berhasil dan tidak ada error 404.

---

5. Verifikasi Build

Jalankan:

npm run build
npm run test

Backend dan frontend harus berhasil build tanpa error.

---

6. Laporan Implementasi

TRAE (ANDA) harus menghasilkan laporan:

TRIPAY_SIMULATOR_GATEWAY_FIX.md

yang menjelaskan:

* perubahan gateway parameter
* endpoint yang diperbaiki
* hasil pengujian simulator.
