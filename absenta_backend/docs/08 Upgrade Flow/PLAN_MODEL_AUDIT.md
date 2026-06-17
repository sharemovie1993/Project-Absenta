## PLAN ARCHITECTURE AUDIT (SaaS Multi-Service Readiness)

Tanggal: 2026-03-16

Audit ini memetakan implementasi Plan Management yang ada saat ini dan menilai kesiapan arsitektur untuk SaaS multi-service. Audit ini tidak melakukan perubahan kode.

---

## 1) Tujuan Audit

Menjawab:
- Struktur tabel `Plan` dan constraint/relasinya
- Daftar plan yang ada saat ini
- Relasi `Plan` dengan `Subscription`, `Billing`, `Invoice`
- Mekanisme plan → feature/service access
- Endpoint API yang mengekspos plan ke frontend
- Dukungan add-on service
- Penilaian kesiapan multi-service SaaS

---

## 2) Analisis Struktur Table Plan

### 2.1 Nama tabel & field

Model: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L406-L442)

`Plan` field utama:
- `id` (uuid)
- `name`
- `price_monthly`, `price_yearly`, `billing_period` (MONTH/YEAR), `currency`
- `trial_days`
- `absensi_mode` (enum `AbsensiMode`)
- `max_user` (limit/kapasitas)
- `features` (string legacy/marketing), `features_json` (Json)
- `description`
- `is_public`, `is_active`, `deleted_at` (soft delete)
- `metadata` (Json)

### 2.2 Constraint/index penting
- Index: `is_active`, `price_monthly`, `name`
- Tidak ada field `code` (identifier canonical). Uniknya nama plan dijaga secara aplikasi (lihat `plan.service.ts`).

Referensi:
- Model Plan: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L406-L442)
- Validasi unique name di service: [plan.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/plan.service.ts#L141-L148)

### 2.3 Relasi foreign key
- `Plan` 1..n `Subscription`
- `Plan` 1..n `PlanFeature` (key/value)
- `Plan` 1..n `PlanChangeRequest` (from/to)

Referensi:
- Plan ↔ Subscription: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L444-L479)
- PlanFeature: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L488-L498)
- PlanChangeRequest: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1572-L1590)

### 2.4 Klasifikasi model Plan saat ini

Secara struktur, `Plan` saat ini berperan sebagai:
- **service plan** (ditandai lewat `features_json` yang berisi modul seperti `ABSENSI`, `KOPERASI`)
- sekaligus **pricing tier** (ditandai lewat `price_*`, `billing_period`, `max_user`, dan variasi nama plan “Micro/Small/Medium/Large/Enterprise”)

Belum ada pemisahan eksplisit “product vs service vs add-on” pada skema (misalnya `service_type`, `product_code`, `addon_code`).

---

## 3) Daftar Plan Yang Saat Ini Ada

Query basis (via Prisma):
- `SELECT ... FROM "Plan" ORDER BY price_monthly ASC`

Total plan aktif di DB saat audit: **23**.

Daftar nama plan:
- CORE_PLATFORM
- Absensi-Simple: Micro/Small/Medium/Large (MONTHLY/YEARLY)
- Absensi-Multi: Small/Medium/Large/Enterprise (MONTHLY/YEARLY)
- Koperasi: Small/Medium/Large (MONTHLY/YEARLY)

Catatan penting:
- `CORE_PLATFORM` adalah plan bootstrap (gratis) untuk memastikan tenant memiliki baseline subscription.
- Plan lain memodelkan “service” (Absensi/Koperasi) + tier.

Referensi pembuatan default CORE subscription saat registrasi tenant:
- [auth.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/auth.service.ts#L402-L416)

---

## 4) Relasi Plan Dengan Subscription

Model: [Subscription](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L444-L479)

Relasi:
- `Tenant (1) → Subscription (n) → Plan (1)`

Temuan kunci tentang “multi subscription”:
- Pada schema tidak ada constraint `@@unique([tenant_id])`, sehingga **satu tenant dapat memiliki banyak subscription**.
- Query di beberapa tempat bahkan mengumpulkan semua subscription aktif untuk menggabungkan feature (union).

Contoh agregasi multi-subscription:
- `getMySubscriptionOverviewQuery` mengembalikan `subscriptions: activeSubscriptions[]` dan `features: aggregatedFeatures`
  - [subscription-overview.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/queries/subscription-overview.query.ts#L25-L108)

Namun, enforcement akses aplikasi via middleware cenderung memilih 1 subscription yang “mewakili” tenant:
- `subscription.guard.ts` mencoba mencari subscription tenant yang punya `plan_snapshot.features_json` mengandung `CORE`, lalu fallback ke subscription terbaru.
  - [subscription.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/middlewares/subscription.guard.ts#L45-L76)

---

## 5) Relasi Plan Dengan Feature / Capability

### 5.1 Tabel penghubung feature

Ada tabel `PlanFeature` (key/value) yang di-relate ke Plan:
- [PlanFeature](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L488-L498)

Saat create/update plan, `plan.service.ts` melakukan:
- parse `features` string menjadi list tag
- menyimpan ke `features_json`
- menormalisasi ke `PlanFeature` dengan `key='MODULE'`

Referensi:
- parse & normalization: [plan.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/plan.service.ts#L40-L56) dan [plan.service.ts:L150-L176](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/plan.service.ts#L150-L176)

### 5.2 Bagaimana fitur tenant ditentukan

Fitur tenant “efektif” tidak langsung dari `PlanFeature`, tetapi dari kombinasi:
- `Plan.features_json` (list modul)
- `Subscription.plan_snapshot.features_json` (snapshot modul pada saat apply invoice)

Agregasi fitur sering berupa union dari semua subscription aktif:
- [subscription-overview.query.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/queries/subscription-overview.query.ts#L62-L95)

Catatan desain penting:
- `extendSubscription` meng-merge `features_json` lama dan plan target (`mergedFeatures`) ke `plan_snapshot`.
  - Ini membuat fitur tenant cenderung “akumulatif” across upgrades, bukan selalu persis sama dengan plan target.
  - Referensi: [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts#L206-L248)

RBAC capability tetap dipakai untuk otorisasi endpoint, tetapi “fitur/service availability” lebih banyak dikontrol oleh `tenantFeatures` (hasil agregasi di backend, lalu dipakai misalnya pada menu/sidebar feature filter).

---

## 6) Cara Plan Diekspos ke Frontend

### 6.1 Endpoint plan list (billing/plans)

Routes:
- `GET /api/billing/plans/public` (skipAuth) → `planController.getPublicActivePlans`
  - [plan.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/plan.routes.ts#L1-L11)
  - [plan.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/plan.controller.ts#L29-L49)
- `GET /api/billing/plans` (protected) → requireCapability `billing.plans.view.list`
  - [plan.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/routes/plan.routes.ts#L13-L24)

Catatan filtering:
- `planService.getAllPlans(false)` hanya memfilter `is_active=true` (tidak memfilter `is_public=true`).
  - [plan.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/plan.service.ts#L58-L78)

### 6.2 Endpoint plan list untuk upgrade wizard

Upgrade wizard mengambil plan public langsung dari prisma dengan filter `is_active=true` dan `is_public=true`:
- [subscription.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/subscription.controller.ts#L40-L48)

---

## 7) Relasi Plan Dengan Billing dan Invoice

Relasi data:
- `Subscription (1) → Billing (n) → Invoice (0..1)`
- `Invoice` menyimpan `subscription_id`, `billing_id` (unique), `tenant_id`.

Referensi model:
- Billing: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L500-L522)
- Invoice: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L524-L590)

Sumber harga billing:
- **Recurring billing** contoh: amount menggunakan `subscription.Plan.price_monthly`.
  - [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts#L893-L941)
- **Upgrade billing**: amount dihitung upstream dan dikirim sebagai input ke `createBillingCommand`, dengan snapshot plan & request id (upgrade_plan_id_snapshot / plan_change_request_id).
  - `createBillingCommand` membentuk invoice dan periode billing berdasarkan `Plan.billing_period` (atau `toPlan.billing_period` untuk upgrade).
  - [create-billing.command.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/commands/create-billing.command.ts#L8-L160)

Kesimpulan:
- Harga **umumnya berasal dari Plan** (monthly/yearly), namun ada jalur enterprise override lewat `Subscription.price_snapshot` dan `Subscription.plan_snapshot`.

---

## 8) Apakah Add-On Service Sudah Didukung?

Tidak ditemukan model add-on canonical pada schema:
- tidak ada `Addon`, `PlanAddon`, `SubscriptionAddon`.

Yang ada:
- `PlanFeature` (key/value) yang dapat dipakai untuk representasi modul/feature, tetapi belum membentuk lifecycle add-on sendiri (trial, pricing, quantity, billing terpisah).

Kesimpulan: **belum ada dukungan add-on service sebagai first-class concept**.

---

## 9) Diagram Arsitektur Plan Saat Ini

```mermaid
flowchart TD
  Tenant -->|1..n| Subscription
  Subscription -->|n..1| Plan
  Plan -->|1..n| PlanFeature

  Subscription -->|1..n| Billing
  Billing -->|0..1| Invoice
  Billing -->|1..n| Payment

  Subscription -->|1..n| PlanChangeRequest
  PlanChangeRequest -->|to| Plan

  subgraph Features
    PlanFeatures[Plan.features_json] --> EffectiveFeatures[tenantFeatures (union)]
    PlanSnapshot[Subscription.plan_snapshot.features_json] --> EffectiveFeatures
  end
```

---

## 10) Analisis Multi-Service Readiness

### Status saat ini
Model saat ini **sudah memiliki beberapa fondasi multi-service**:
- Schema mengizinkan `Tenant` memiliki banyak `Subscription` (tanpa unique constraint per tenant).
- Backend sudah punya pola agregasi feature lintas subscription aktif (`aggregatedFeatures`).
- Ada mekanisme plan change (`PlanChangeRequest`) yang dapat diterapkan saat invoice paid (lifecycle upgrade).

Namun model ini masih **belum sepenuhnya “multi-service SaaS modular”** karena:
- `Plan` tidak memiliki identitas canonical `code`/`service_type` untuk membedakan “subscription layanan A vs layanan B” secara eksplisit.
- `extendSubscription` cenderung menggabungkan fitur lama + fitur plan baru (akumulatif), sehingga batas service/subscription menjadi kurang tegas jika ke depan ingin memodelkan “subscription per service” yang independen.
- Tidak ada konsep add-on (pricing/quantity/lifecycle add-on tidak ada).
- Middleware enforcement masih memakai heuristik “subscription dengan CORE” sebagai baseline; ini masih workable, tapi bukan model formal “core subscription + service subscriptions” yang terdefinisi dengan constraint.

### Kesimpulan eksplisit
- **Bukan single-product murni**, karena sudah ada plan yang merepresentasikan modul layanan (`ABSENSI`, `KOPERASI`) dan sistem mengizinkan multi-subscription.
- Tetapi **belum sepenuhnya siap untuk multi-service modular** (per-service subscription yang clean + add-on), karena plan/subscription belum bertipe service dan belum ada arsitektur add-on yang first-class.

Rekomendasi perubahan arsitektur (di luar scope audit):
- Tambah `Plan.code` (unique) dan `Plan.service_code/service_type`.
- Tambah `Subscription.service_code` atau relasi eksplisit `Subscription` → `Service`.
- Tambah model add-on: `Addon`, `PlanAddon`, `SubscriptionAddon` + billing integration.
- Ubah definisi fitur tenant agar tidak hanya “merge akumulatif”, tetapi mengikuti rule yang eksplisit per subscription/service.

