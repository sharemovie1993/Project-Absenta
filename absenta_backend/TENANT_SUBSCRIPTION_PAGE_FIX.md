# TENANT_SUBSCRIPTION_PAGE_FIX

Generated on: 2026-03-16

## Perbaikan My Subscription Page Guard

- Frontend route guard `/billing/my-subscription` diganti dari `billing.subscriptions.view.active` menjadi `billing.my.subscription.view`.
- Frontend route guard `/billing` (redirect) diganti dari `billing.subscriptions.view.active` menjadi `billing.my.subscription.view`.

File terkait:
- `frontend/absenta_frontend/src/App.tsx`

## Kontrak Endpoint Subscription Tenant

- Menggunakan endpoint tenant self-resource:
  - `GET /api/me/subscription`

File terkait:
- `frontend/absenta_frontend/src/api/mySubscription.api.ts`

## Perbaikan Notification Polling

- Menambahkan capability gate sebelum memanggil attendance feed:
  - polling attendance hanya berjalan jika user memiliki `attendance.reports.view`
- Jika attendance feed mengembalikan 403 maka attendance polling dimatikan (tidak memanggil lagi endpoint yang sama) agar console tidak dipenuhi error.
- Socket subscription untuk attendance feed juga tidak berjalan jika capability tidak tersedia.

File terkait:
- `frontend/absenta_frontend/src/hooks/useNotifications.ts`

## Verifikasi

- Backend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS
- Frontend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS

