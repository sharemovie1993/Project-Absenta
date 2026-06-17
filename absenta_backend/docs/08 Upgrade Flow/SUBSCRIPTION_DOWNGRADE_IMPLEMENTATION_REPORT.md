## SUBSCRIPTION DOWNGRADE IMPLEMENTATION REPORT

Tanggal: 2026-03-16

Implementasi ini menambahkan downgrade flow berbasis best-practice SaaS: downgrade dijadwalkan dan baru berlaku pada akhir periode billing (renewal), tanpa membuat billing/invoice baru saat request downgrade.

---

## 1) Endpoint Downgrade yang Ditambahkan

Routes:
- `POST /api/subscriptions/:id/downgrade`
- `POST /api/subscriptions/:id/downgrade/cancel`

Route file: [subscription.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/subscription.routes.ts#L80-L96)

Controller:
- [subscription.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/subscription.controller.ts)

---

## 2) Perubahan PlanChangeRequest

### Field baru
- `PlanChangeRequest.change_type` enum:
  - `UPGRADE`
  - `DOWNGRADE`

Schema:
- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1600-L1635)

Migration:
- [migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260316055810_add_plan_change_type/migration.sql)

Catatan:
- Field waktu `effective_date` sudah ada dan dipakai sebagai `effective_at` (sesuai instruksi).

---

## 3) Validasi Downgrade

Validasi pada `scheduleDowngradeCommand`:
- Subscription bukan service `CORE` (CORE tidak bisa downgrade)
- Subscription tidak sedang `UPGRADE_PENDING` atau `PENDING_PAYMENT`
- Plan target harus `is_active=true`
- Plan target harus `service_code` sama dengan subscription
- Harga plan target harus lebih rendah dari plan saat ini (dibandingkan sebagai monthly-equivalent)
- Tidak boleh ada plan change SCHEDULED lain untuk subscription tersebut (mengikuti unique constraint)

Implementasi:
- [schedule-downgrade.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/commands/schedule-downgrade.command.ts)

---

## 4) Scheduler Renewal Apply Downgrade

Downgrade diterapkan pada saat proses recurring billing berjalan:
- Sebelum menghitung amount & membuat billing untuk `next_billing_date`, sistem mengecek apakah ada `PlanChangeRequest`:
  - `status=SCHEDULED`
  - `change_type=DOWNGRADE`
  - `effective_date <= billingDate`
- Jika ada, subscription di-update terlebih dahulu (`plan_id`, `service_code`, `plan_snapshot`), lalu request di-mark `APPLIED`.
- Setelah itu billing dibuat menggunakan plan baru.

Implementasi:
- Apply command: [apply-due-downgrades.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/commands/apply-due-downgrades.command.ts)
- Scheduler hook: [recurringBilling.job.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/recurringBilling.job.ts#L19-L113)

---

## 5) Cancel Downgrade

Cancel downgrade:
- cari `PlanChangeRequest` untuk subscription tersebut dengan `status=SCHEDULED` dan `change_type=DOWNGRADE`
- update status menjadi `CANCELLED`

Implementasi:
- [schedule-downgrade.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/commands/schedule-downgrade.command.ts#L60-L86)

---

## 6) Subscription Overview API

Subscription overview sekarang mengembalikan `scheduled_downgrade`:
- `to_plan_id`, `to_plan_name`
- `effective_at`
- `status`

Implementasi:
- [subscription-overview.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/queries/subscription-overview.query.ts#L28-L109)

---

## 7) Pengujian

Unit test yang ditambahkan:
- Schedule downgrade tidak mengubah plan sebelum renewal
- Apply downgrade terjadi saat renewal (sebelum billing dibuat) dan billing amount menggunakan plan baru
- Cancel downgrade mencegah apply

Test file:
- [subscription.downgrade-flow.test.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/__tests__/subscription.downgrade-flow.test.ts)

Perintah verifikasi:
- `npm run test:unit`
- `npm run build`

