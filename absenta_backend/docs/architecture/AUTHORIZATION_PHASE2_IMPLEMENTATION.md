## Authorization Phase 2 – Implementation Report

Tanggal: 2026-03-15

- Hardening Subscription Guard: akses CORE hanya untuk subscription berstatus ACTIVE atau TRIAL (TRIAL wajib belum melewati end_date).
- Status non-valid (EXPIRED/CANCELLED/SUSPENDED/PENDING_PAYMENT) diblok dengan 403 `SUBSCRIPTION_NOT_ACTIVE`.
- Whitelist billing dibuat via `routeOptions.config.billing=true` untuk endpoint billing/subscriptions/invoice/payments sehingga payment/renewal tetap bisa dilakukan saat subscription tidak valid.
- Observability event saat diblok: `SUBSCRIPTION_NOT_ACTIVE` (tenantId, subscriptionStatus, endpoint, timestamp).
- Git: commit dan push.

