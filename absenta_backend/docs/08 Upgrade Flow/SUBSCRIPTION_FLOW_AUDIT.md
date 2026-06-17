## Audit Subscription Flow (Registration → Upgrade → Invoice → Payment → Downgrade)

Tanggal: 2026-03-16

Dokumen ini memetakan flow subscription Absenta berdasarkan implementasi backend saat ini. Audit ini tidak melakukan perubahan kode.

Referensi instruksi: [Instruksi 08](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/08%20Upgrade%20Flow/01%20Instruksi%2008%20%E2%80%93%20Subscription%20Flow%20Audit%20(Registration%20%E2%86%92%20Upgrade%20%E2%86%92%20Invoice%20%E2%86%92%20Payment%20%E2%86%92%20Downgrade))

---

## 1) Registration Flow

### Endpoint yang digunakan
- `POST /api/auth/register-tenant` (public, skipAuth)
  - Route: [auth.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/routes/auth.routes.ts#L12-L61)
  - Controller: [auth.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts)
  - Service: [auth.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/auth.service.ts#L216-L539)

Catatan: `POST /api/auth/register` ada, tetapi itu untuk membuat user ADMIN pada tenant yang sudah ada (bukan registrasi tenant baru).

### Service yang membuat tenant
Pembuatan tenant dilakukan dalam transaksi pada `authService.registerTenant()`:
- `Tenant` dibuat (`status: ACTIVE`)
- `Sekolah` dibuat (dengan data NPSN/master sekolah)
- `OrganizationalPosition` default dibuat (seed struktur organisasi)
- `User` admin dibuat (role ADMIN)
- `Subscription` default dibuat
- `Config` onboarding (opsional) disimpan jika user memilih plan saat registrasi
- `ActivityLog` ditulis (TENANT_REGISTERED)

Referensi: [auth.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/auth.service.ts#L339-L487)

### Table yang terlibat
- `Tenant`
- `Sekolah`
- `OrganizationalPosition`
- `User`
- `Role`
- `Subscription`
- `Plan`
- `Config` (onboarding requested plan & payload)
- `ActivityLog`

### Diagram registration
```mermaid
flowchart TD
  A[POST /api/auth/register-tenant] --> B[authService.registerTenant]
  B --> C[Create Tenant]
  B --> D[Create Sekolah + default positions]
  B --> E[Create ADMIN user]
  B --> F[Create default Subscription (CORE_PLATFORM)]
  B --> G[Store onboarding_requested_* in Config (optional)]
  B --> H[ActivityLog: TENANT_REGISTERED]
  B --> I[Emit domain event: tenant.created]
```

---

## 2) Default Subscription Creation

Default subscription setelah registrasi tenant:
- Plan default: `CORE_PLATFORM` (wajib ada & aktif)
- Status: `ACTIVE`
- `start_date = now`
- `end_date = now + 100 tahun`
- `next_billing_date = end_date`
- `auto_renew = false`

Artinya: tenant selalu punya CORE subscription “perpetual” untuk bootstrapping tenant, sedangkan ordering plan/service subscription dilakukan setelah tenant hidup (melalui flow billing/upgrade).

Referensi: [auth.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/auth.service.ts#L402-L416)

---

## 3) Upgrade Plan Flow

Flow upgrade/ordering plan berjalan di modul billing subscription.

### Endpoint terkait upgrade
Prefix route: `/api/subscriptions/*`

Route: [subscription.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/subscription.routes.ts)

Endpoint utama (upgrade flow):
- `POST /api/subscriptions/upgrade-wizard`
- `POST /api/subscriptions/:id/choose-plan`
- `POST /api/subscriptions/order`
- `POST /api/subscriptions/upgrade/cancel`

Audit implementasi upgrade yang sudah ada di repo:
- [file_laporan_upgrade_subscription.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/file_laporan_upgrade_subscription.md)
- [file_laporan_upgrade_subscription_step_by_step.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/file_laporan_upgrade_subscription_step_by_step.md)

### Ringkasan alur upgrade (sesuai controller/service)
1. Tenant admin memilih plan (wizard / choose-plan / order)
2. Sistem membuat `PlanChangeRequest` status `SCHEDULED`
3. Sistem membuat `Billing` charge_type `UPGRADE`, lalu generate `Invoice`
4. Subscription dapat berpindah ke status `UPGRADE_PENDING` pada fase checkout (detail tergantung branch controller)
5. User diarahkan ke payment gateway menggunakan invoice/public link atau pembayaran internal.

Referensi utama implementasi: [subscription.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/subscription.controller.ts)

---

## 4) Invoice Creation

Invoice dibuat dari Billing.

Cara create invoice yang dominan pada flow billing:
- `InvoiceService.generateInvoiceFromBilling(tenantId, billingId, { due_date })`
  - Service: [invoice.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/services/invoice.service.ts#L943-L962)
  - Command: [generate-invoice-from-billing.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/services/commands/generate-invoice-from-billing.command.ts)

Status invoice awal:
- `InvoiceStatus.DRAFT`

Referensi: [generate-invoice-from-billing.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/services/commands/generate-invoice-from-billing.command.ts#L120-L155)

Relasi utama:
- `Billing` ↔ `Invoice` (1:1)
- `Billing` ↔ `Subscription` (n:1)
- `Invoice` menyimpan `billing_id` + `subscription_id` + `tenant_id`

---

## 5) Payment Flow (Gateway + Webhook)

### Webhook endpoints (public)
Prefix: `/webhooks/payment/*`

Route: [webhook.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/routes/webhook.routes.ts)

Endpoint:
- `POST /webhooks/payment/tripay` (rawBody=true)
- `POST /webhooks/payment/midtrans`
- `POST /webhooks/payment/stripe`
- `POST /webhooks/payment/xendit`

Handler:
- [webhook.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/controllers/webhook.controller.ts)

### Proses webhook → update payment
Webhook controller memverifikasi signature/token, lalu memanggil:
- `paymentService.processWebhook(gateway, payload, webhookId)`

Downstream, payment workflow melakukan:
- Update `Payment.status` (SUCCESS/FAILED/EXPIRED/CANCELLED)
- Emit domain event `payment.succeeded` (hanya ketika SUCCESS dan “authorized source”)

Referensi:
- Payment workflow: [payments.workflow.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payments.workflow.ts#L214-L307)

---

## 6) Subscription Activation (Invoice Paid → Extend Subscription)

Model aktivasi subscription saat payment success:
1. Webhook Tripay memproses status payment → emit `payment.succeeded`
2. Billing consumer menerima `payment.succeeded` dan memanggil `billingService.markAsPaid(billingId, ..., confirmedBy='TRIPAY_WEBHOOK')`
3. `billingService.markAsPaid`:
   - Update Invoice menjadi `PAID`
   - Update Billing menjadi `PAID`
   - Memanggil `billingService.extendSubscription(invoiceId)`
4. `billingService.extendSubscription`:
   - Terapkan `PlanChangeRequest` (jika ada) → set `Subscription.plan_id = to_plan_id` dan `PlanChangeRequest.status = APPLIED`
   - Set `Subscription.status = ACTIVE`
   - Set `Subscription.end_date` dan `next_billing_date` = `invoice.period_end`
   - Set `auto_renew = true`
   - Set `last_applied_invoice_id = invoice.id`

Referensi:
- Consumer: [payment-succeeded.consumer.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/event-handlers/payment-succeeded.consumer.ts#L9-L89)
- Mark paid: [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts#L547-L746)
- Extend subscription: [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts#L25-L265)

Catatan keamanan penting:
- `markAsPaid` meng-hardcode guard: hanya menerima `confirmedBy === 'TRIPAY_WEBHOOK'`.

---

## 7) Middleware Guard Audit (Tenant/Subscription/Feature/RBAC)

### Middleware utama
- Auth middleware: [auth.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/auth.ts)
- Tenant middleware (resolve tenant + status + subscription guard): [tenant.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/tenant.ts)
- Core subscription guard: [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts)
- RBAC capability guard: [requireCapability.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/requireCapability.ts)
- Feature/service capability guard (module capability): [capability.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/plugins/capability.guard.ts)

### Dampak terhadap flow upgrade/payment
`subscriptionGuard` secara eksplisit bypass path billing/payment/invoice/subscriptions agar pembayaran/aktivasi tetap bisa dilakukan walau subscription belum aktif:
- `/api/billing*`, `/api/subscriptions*`, `/api/invoice*`, `/api/payment*`, `/webhooks/payment*`, dll.

Referensi bypass list: [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts#L32-L52)

Catatan audit middleware yang lebih detail sudah tersedia di repo:
- [file_laporan_audit_layer_middleware_absenta_platform.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/file_laporan_audit_layer_middleware_absenta_platform.md)

---

## 8) Downgrade Flow

Temuan:
- Tidak ditemukan endpoint downgrade canonical (misalnya `POST /api/subscriptions/downgrade`) pada modul billing subscription saat ini.
- Perubahan plan saat ini berfokus pada flow “upgrade/order” menggunakan `PlanChangeRequest (SCHEDULED → APPLIED)` yang diterapkan saat invoice paid.

Implikasi:
- Jika downgrade dibutuhkan, saat ini belum ada flow resmi pada layer API; perlu implementasi baru (di luar scope audit ini).

---

## 9) Expired Subscription Behaviour

### Enforcement akses aplikasi
Untuk request non-billing, tenant harus memiliki subscription `ACTIVE` (atau `TRIAL` yang belum lewat `end_date`). Jika tidak, `subscriptionGuard` mengembalikan 403.

Referensi: [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts#L82-L110)

### Renewal / overdue / suspend jobs
Scheduler billing menjalankan beberapa job:
- Auto-renew untuk subscription expired dengan `auto_renew=true`: [subscriptionRenewal.job.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/subscriptionRenewal.job.ts)
- Recurring billing + overdue/suspend pipeline: [recurringBilling.job.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/recurringBilling.job.ts)
- Trial/subscription expiration delegasi ke `subscriptionService.checkExpiredSubscriptions()`: [trialExpiration.job.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/trialExpiration.job.ts)

Scheduler bootstrap:
- [billing.jobs.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/infra/scheduler/billing.jobs.ts#L1-L20)

---

## 10) End-to-End Flow Map

```mermaid
flowchart TD
  R[Registration: POST /api/auth/register-tenant] --> T[Tenant created]
  T --> S0[Default Subscription: CORE_PLATFORM ACTIVE (perpetual)]
  S0 --> U[Upgrade/Order: POST /api/subscriptions/*]
  U --> B[Billing created (charge_type=UPGRADE)]
  B --> I[Invoice generated (status=DRAFT)]
  I --> P[User pays via gateway]
  P --> WH[Webhook: POST /webhooks/payment/*]
  WH --> PS[payment.succeeded event]
  PS --> MP[billingService.markAsPaid (Tripay)]
  MP --> IP[Invoice: PAID, Billing: PAID]
  IP --> ES[billingService.extendSubscription]
  ES --> SA[Subscription ACTIVE + plan applied + end_date/next_billing_date updated]
  SA --> RB[Recurring billing / renewal jobs]
  RB --> EXP[Expired / overdue / suspend behaviors]
```

