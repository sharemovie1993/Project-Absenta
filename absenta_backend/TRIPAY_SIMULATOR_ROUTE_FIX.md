# TRIPAY_SIMULATOR_ROUTE_FIX

Laporan implementasi perbaikan route Tripay Simulator setelah refactor RBAC.

## Perubahan yang Dilakukan

- **Backend Route Mount**: Mendaftarkan `testRoutes` pada `src/infra/router.ts` dengan prefix `/api/platform/payments`.
- **Capability Refactor**: Mengubah capability pada `src/modules/payment/routes/test.routes.ts` dari `superadmin.payments.test` menjadi `payments.test.simulate`.
- **Frontend API Client**: Memperbarui `src/api/tripaySimulator.api.ts` untuk menggunakan endpoint baru:
    - `POST /api/platform/payments/test/simulate/tripay`
    - `GET /api/platform/payments/test/tripay/health`
    - `GET /api/platform/payments/test/scenarios`
- **Frontend Page Documentation**: Memperbarui teks dokumentasi pada `src/pages/billing/TripaySimulatorPage.tsx` agar sesuai dengan endpoint yang baru.

## Verifikasi Build

- **Backend**: `npm run build` - SUCCESS
- **Frontend**: `npm run build` - SUCCESS

## Hasil Pengujian

- Endpoint simulator sekarang terisolasi di bawah domain platform (`/api/platform/...`).
- Akses dikontrol ketat menggunakan capability `payments.test.simulate` yang di-bypass oleh role `SUPERADMIN`.
- Integrasi frontend dan backend telah disesuaikan dan diverifikasi melalui proses build yang bersih.
