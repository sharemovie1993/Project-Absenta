# TRIPAY_SIMULATOR_ENDPOINT_FIX

Generated on: 2026-03-16

## Masalah

Frontend mengirim request dengan double prefix:

- `POST /api/api/payments/test/simulate/TRIPAY`

Seharusnya:

- `POST /api/payments/test/simulate/TRIPAY`

## Perbaikan

Menghapus prefix `/api` dari path pada Tripay simulator API client (karena axios sudah memiliki baseURL `/api`).

File yang diperbaiki:
- `frontend/absenta_frontend/src/api/tripaySimulator.api.ts`

Perubahan endpoint:
- `GET /api/payments?...` → `GET /api/payments?...` (frontend path: `/payments?...`)
- `POST /api/payments/test/simulate/TRIPAY` (frontend path: `/payments/test/simulate/TRIPAY`)
- `GET /api/payments/test/tripay/health` (frontend path: `/payments/test/tripay/health`)
- `GET /api/payments/test/scenarios` (frontend path: `/payments/test/scenarios`)

## Verifikasi Backend Route

Backend tersedia pada:

- `POST /api/payments/test/simulate/:gateway`

File:
- `src/modules/payment/routes/test.routes.ts`

## Verifikasi Build

- Backend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS
- Frontend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS

