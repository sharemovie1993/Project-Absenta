## SUBSCRIPTION CANCEL IMPLEMENTATION REPORT

Tanggal: 2026-03-16

Implementasi ini menambahkan cancel subscription flow berbasis best-practice SaaS:
- Cancel dijadwalkan dan baru berlaku pada akhir periode billing (renewal).
- Tidak ada billing/invoice/payment baru yang dibuat saat request cancel.
- CORE subscription tidak bisa dibatalkan.

---

## 1) Endpoint Cancel yang Ditambahkan

Routes:
- `POST /api/subscriptions/:id/cancel` (body optional: `{ reason }`)
- `POST /api/subscriptions/:id/cancel/undo`

Route file:
- [subscription.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/subscription.routes.ts)

Controller:
- [subscription.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/subscription.controller.ts)

---

## 2) Perubahan Enum/Schema PlanChangeRequest

Schema update:
- `PlanChangeType` ditambah value `CANCEL`
- `PlanChangeRequest.to_plan_id` dibuat nullable untuk mendukung cancel (to_plan_id = null)
- `PlanChangeRequest.toPlan` menjadi optional

Referensi:
- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1613-L1643)
- Migration: [subscription_cancel_flow migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260316061749_subscription_cancel_flow/migration.sql)

---

## 3) Mekanisme Cancel (Schedule)

Cancel request membuat `PlanChangeRequest`:
- `change_type = CANCEL`
- `status = SCHEDULED`
- `effective_date = subscription.next_billing_date` (fallback ke end_date)
- `to_plan_id = null`

Validasi:
- Tidak boleh untuk `service_code=CORE`
- Tidak boleh jika status `UPGRADE_PENDING` / `PENDING_PAYMENT`
- Tidak boleh jika sudah ada plan change SCHEDULED (upgrade/downgrade/cancel) untuk subscription

Implementasi:
- [schedule-cancel.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/commands/schedule-cancel.command.ts)

---

## 4) Apply Cancel pada Renewal

Pada recurring billing job, sebelum membuat billing:
- Jika ada `PlanChangeRequest` SCHEDULED + CANCEL + `effective_date <= billingDate`
  - subscription diubah menjadi `CANCELLED`
  - `auto_renew=false`
  - `cancel_date=billingDate`
  - PlanChangeRequest diubah menjadi `APPLIED`
- Setelah itu recurring billing berhenti untuk subscription tersebut (karena status bukan ACTIVE).

Implementasi:
- Apply command: [apply-due-cancel.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/commands/apply-due-cancel.command.ts)
- Hook di job: [recurringBilling.job.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/recurringBilling.job.ts)

---

## 5) Guard Behavior Setelah Cancel

Setelah cancel diaplikasikan (status `CANCELLED`), subscription guard akan menolak akses service karena subscription tidak lagi `ACTIVE/TRIAL`.

Referensi:
- [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts)

---

## 6) Subscription Overview API

Subscription overview menambahkan field:
- `scheduled_cancel` (jika ada)

Implementasi:
- [subscription-overview.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/queries/subscription-overview.query.ts)

---

## 7) Hasil Unit Testing & Build

Unit test yang ditambahkan:
- schedule cancel tidak mengubah status subscription
- apply cancel pada renewal tidak membuat billing
- undo cancel membuat renewal kembali normal (billing dibuat)

Test file:
- [subscription.cancel-flow.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/__tests__/subscription.cancel-flow.test.ts)

Perintah verifikasi:
- `npm run test:unit`
- `npm run build`

