# TRIPAY_SIMULATOR_GATEWAY_FIX

Generated on: 2026-03-16

## Masalah

Tripay simulator memanggil:

- `POST /api/payments/test/simulate/TRIPAY`

Namun implementasi simulator membutuhkan gateway dalam format lowercase pada URL parameter.

## Perbaikan

- Mengubah frontend agar memakai gateway lowercase:
  - `POST /api/payments/test/simulate/tripay`

File yang diperbaiki:
- `frontend/absenta_frontend/src/api/tripaySimulator.api.ts`

## Hardening Backend

Backend endpoint `/api/payments/test/simulate/:gateway` sekarang menerima gateway uppercase/lowercase dan menormalisasi ke uppercase sebelum diproses.

File yang diperbaiki:
- `src/modules/payment/controllers/test.controller.ts`
- `src/modules/payment/routes/test.routes.ts`

Tambahan endpoint agar sesuai kontrak halaman simulator:
- `GET /api/payments/test/scenarios`
- `GET /api/payments/test/tripay/health`

## Verifikasi Build

- Backend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS
- Frontend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS

