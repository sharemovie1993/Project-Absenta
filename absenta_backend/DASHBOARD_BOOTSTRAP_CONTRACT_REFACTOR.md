# DASHBOARD BOOTSTRAP CONTRACT REFACTOR (Absenta SaaS)

Generated on: 2026-03-16

## Bootstrap Endpoints (Sebelum)

- GET /api/auth/me
- GET /api/tenants/:id
- GET /api/billing/subscriptions/active
- GET /api/notifications/status
- GET /api/dashboard/overview

## Bootstrap Endpoints (Sesudah)

- GET /api/auth/me
- GET /api/system/config
- GET /api/me/tenant
- GET /api/me/subscription
- GET /api/dashboard/overview

## Endpoint Platform Yang Dihapus Dari Bootstrap Tenant

- /api/tenants/:id
- /api/billing/subscriptions/active
- /api/notifications/status

## Endpoint Tenant Baru Yang Digunakan

- /api/me/tenant
- /api/me/subscription

