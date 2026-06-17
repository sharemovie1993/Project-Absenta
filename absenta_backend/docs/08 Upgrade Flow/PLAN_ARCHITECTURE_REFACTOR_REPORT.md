## PLAN ARCHITECTURE REFACTOR REPORT (Multi-Service SaaS Ready)

Tanggal: 2026-03-16

Dokumen ini merangkum perubahan implementasi refactor Plan Architecture agar siap untuk SaaS multi-service modular, dengan menjaga billing lifecycle yang sudah ada tetap berjalan.

---

## 1) Perubahan Schema Database

### Plan
- Tambah field:
  - `Plan.code` (String, unique)
  - `Plan.service_code` (String)

Referensi: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L406-L442)

### Subscription
- Tambah field:
  - `Subscription.service_code` (String)

Referensi: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L444-L479)

### Add-on foundation
- Tambah model:
  - `Addon`
  - `PlanAddon`
  - `SubscriptionAddon`

Referensi: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L488-L548)

---

## 2) Migrasi Data Plan (code & service_code)

Strategi backfill:
- `Plan.code` diisi dari `Plan.name` dengan normalisasi uppercase + underscore (non-alphanumeric → `_`).
- `Plan.service_code` ditentukan dengan rule:
  - `CORE_PLATFORM` → `CORE`
  - `Absensi-*` → `ABSENSI`
  - `Koperasi-*` → `KOPERASI`
  - fallback → `CORE`

Selain Plan, `Subscription.service_code` diisi berdasarkan `Plan.service_code`.

Referensi migration: [migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260316053431_plan_architecture_refactor/migration.sql)

---

## 3) Perubahan Logic Subscription

### 3.1 Registrasi tenant tetap membuat CORE subscription
- `authService.registerTenant()` sekarang mengisi `service_code` pada subscription default dari `corePlan.service_code` (`CORE`).

Referensi: [auth.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/auth.service.ts#L402-L416)

### 3.2 Create subscription (admin/internal) mengisi service_code dari plan
- `subscriptionService.createSubscription()` sekarang menyimpan:
  - `subscription.service_code = plan.service_code`
  - snapshot mencakup `plan.code` dan `plan.service_code`

Referensi: [subscription.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/subscription.service.ts#L297-L345)

### 3.3 Upgrade wizard bootstrap subscription (UPGRADE_PENDING)
- Saat subscription belum ada, controller membuat subscription UPGRADE_PENDING dengan `service_code` dari plan.

Referensi: [subscription.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/subscription.controller.ts#L287-L306)

---

## 4) Perubahan extendSubscription (Stop Feature Merge)

Perubahan utama:
- Sebelumnya `extendSubscription` menggabungkan fitur snapshot lama + fitur plan baru (merge/union).
- Sekarang `plan_snapshot.features_json` di-set langsung dari `targetPlan.features_json` (tanpa merge).
- `subscription.service_code` juga di-update mengikuti `targetPlan.service_code`.

Referensi: [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts#L206-L248)

---

## 5) Update Subscription Guard

Rule baru:
- Tenant harus punya **CORE subscription aktif** (`service_code=CORE`) untuk akses endpoint non-billing.
- Untuk endpoint yang merepresentasikan service tertentu, tenant juga harus punya subscription aktif untuk service tersebut:
  - `/api/attendance*` → require `service_code=ABSENSI`
  - `/api/cooperative*` → require `service_code=KOPERASI`

Referensi: [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts#L1-L111)

Catatan:
- Daftar bypass untuk billing/payment/invoice/subscriptions/webhooks tetap dipertahankan sehingga flow pembayaran tidak terblokir.

---

## 6) Seeder Update (Plan Code/Service Code)

Seeder sekarang memastikan:
- Plan canonical memiliki `code` dan `service_code`.
- Dev tenant subscription yang dibuat/di-update juga menyertakan `service_code`.

Referensi: [seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts)

---

## 7) Validasi Setelah Refactor

Validasi yang dijalankan:
- Unit tests: `npm run test:unit` (PASS)
- Build: `npm run build` (PASS)

Validasi fungsional (by design):
- Registrasi tenant membuat CORE subscription dengan `service_code=CORE` (lihat auth service).
- Upgrade plan tetap menghasilkan billing/invoice (flow billing tidak diubah).
- Payment webhook tetap mengaktifkan subscription melalui `billingService.markAsPaid` → `extendSubscription` (flow event tidak diubah).

