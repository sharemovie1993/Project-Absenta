# TENANT_BILLING_CAPABILITY_FIX

Generated on: 2026-03-16

## Capability Baru (Tenant Billing)

- billing.my.subscription.create
- billing.my.subscription.upgrade
- billing.my.subscription.view
- billing.my.invoice.view
- billing.my.invoice.pay

File terkait:
- `docs/action_catalog_canonical_futureproof.md`
- `scripts/audit/capability-domain-classifier.ts`
- `src/config/capability-domains.generated.ts`

## Perubahan Guard Endpoint (Tenant Checkout/Upgrade)

Endpoint yang dipakai tenant checkout (frontend `CheckoutPage`) adalah:

- `POST /api/billing/subscriptions/order`
  - dari: `billing.subscriptions.order`
  - menjadi: `billing.my.subscription.create` atau `billing.my.subscription.upgrade`
- `POST /api/billing/subscriptions/upgrade-wizard`
  - dari: `billing.subscriptions.upgrade.wizard`
  - menjadi: `billing.my.subscription.upgrade`
- `POST /api/billing/subscriptions/:id/choose-plan`
  - dari: `billing.subscriptions.choose.plan`
  - menjadi: `billing.my.subscription.upgrade`
- `POST /api/billing/subscriptions/upgrade/cancel`
  - dari: `billing.subscriptions.upgrade.cancel`
  - menjadi: `billing.my.subscription.upgrade`

File terkait:
- `src/modules/billing/routes/subscription.routes.ts`

## Perubahan Frontend Page Guard (Checkout)

- `/billing/checkout`
  - dari: `billing.subscriptions.create`
  - menjadi: `billing.my.subscription.create`

File terkait:
- `frontend/absenta_frontend/src/App.tsx`

## Update RBAC Baseline (ADMIN Tenant)

Baseline ADMIN tenant sudah otomatis mencakup capability baru karena:
- capability baru masuk Action Catalog
- domain capability baru terklasifikasi non-PLATFORM (SHARED)

File terkait:
- `prisma/seed_policies.ts`

## Verifikasi

- Backend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS
- Frontend:
  - `npm run build`: SUCCESS
  - `npm run test`: SUCCESS

