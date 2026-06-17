Instruksi Implementasi – Fix Tripay Simulator Endpoint (Double API Prefix)

Masalah yang ditemukan pada halaman:

/billing/tripay-simulator

Console menunjukkan warning:

Detected double /api prefix in request.

Request yang dikirim frontend:

POST /api/api/payments/test/simulate/TRIPAY

Seharusnya:

POST /api/payments/test/simulate/TRIPAY

Akibatnya backend mengembalikan:

404 Not Found.

---

1. Periksa Konfigurasi Axios

Periksa file konfigurasi API client, biasanya:

src/utils/api.ts
atau
src/lib/api.ts

Pastikan axios memiliki baseURL:

```ts
baseURL: "/api"
```

---

2. Perbaiki Endpoint di TripaySimulatorPage

File:

src/pages/billing/TripaySimulatorPage.tsx

Cari request berikut:

```ts
api.post("/api/payments/test/simulate/TRIPAY")
```

ubah menjadi:

```ts
api.post("/payments/test/simulate/TRIPAY")
```

---

3. Scan Endpoint Serupa

Lakukan scan pada frontend untuk memastikan tidak ada lagi endpoint:

```ts
/api/api/
```

Cari pola:

```ts
"/api/"
```

di dalam pemanggilan axios.

Semua endpoint harus mengikuti format:

```ts
api.get("/endpoint")
api.post("/endpoint")
```

bukan:

```ts
api.get("/api/endpoint")
```

---

4. Verifikasi Endpoint Backend

Pastikan backend memiliki route:

POST /api/payments/test/simulate/TRIPAY

biasanya berada pada module:

payments.routes.ts

---

5. Pengujian

Login sebagai:

SUPERADMIN

Buka halaman:

/billing/tripay-simulator

Klik:

Simulate Success

Pastikan response:

```json
{
  "status": "PAID"
}
```

dan invoice berubah menjadi:

PAID.

---

6. Verifikasi Build

Jalankan:

npm run build
npm run test

Backend dan frontend harus berhasil build tanpa error.

---

7. Laporan Implementasi

TRAE (ANDA) harus menghasilkan laporan:

TRIPAY_SIMULATOR_ENDPOINT_FIX.md

yang menjelaskan:

* file yang diperbaiki
* endpoint yang diubah
* hasil pengujian simulator pembayaran.
