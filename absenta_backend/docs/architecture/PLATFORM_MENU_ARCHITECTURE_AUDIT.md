## Platform Menu Architecture Audit (SUPERADMIN)

Tanggal: 2026-03-16

Audit ini memetakan kondisi aktual menu platform (`Menu.scope = PLATFORM`) sebelum refactor menu domain lebih lanjut.
Audit ini tidak melakukan perubahan kode.

Sumber data:
- Tabel `Menu` (scope=PLATFORM) pada database
- Sidebar runtime melalui `GET /api/menu/sidebar` (role SUPERADMIN)
- Frontend router pada [App.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx)

---

## 1) Ekstrak Data Menu PLATFORM

### 1.1 Tabel data mentah (PLATFORM, is_active=true)

| id | name | path | parent_id | required_capability | is_active | order |
|---|---|---|---|---|---|---|
| f33414e7-293d-4071-b998-6a67d27ddbee | Role Management | /management/roles | 34407027-56b4-4623-bd58-2016e0c3ec4c | core.users.view.roles | true | 10 |
| f5baf1d6-c47a-41ea-a07c-e219f1314579 | Menu Management | /management/menus | 34407027-56b4-4623-bd58-2016e0c3ec4c | core.menu.view.list | true | 20 |
| a7a3b2d0-ca4f-45fa-88ed-439f225d293c | Infrastructure | /superadmin/infra | 34407027-56b4-4623-bd58-2016e0c3ec4c | superadmin.infra.view.socket_global | true | 30 |
| 18f23d95-e5c2-4400-a08c-485755369e70 | Billing Dashboard | /billing/dashboard | 460e277e-66e4-4ab9-a465-334cf8a80308 | dashboard.view.financial_summary | true | 10 |
| d699c87f-e78d-41e1-a4b3-8b0fba4744fe | Plans | /billing/plans | 460e277e-66e4-4ab9-a465-334cf8a80308 | billing.plans.view.list | true | 20 |
| 95a8618e-53c9-4b3d-a8f1-f5571c6de562 | Subscriptions | /billing/subscriptions | 460e277e-66e4-4ab9-a465-334cf8a80308 | billing.subscriptions.view.active | true | 30 |
| 9f3fa2ab-344f-4d52-8807-b86a9c473109 | Invoices | /billing/invoices | 460e277e-66e4-4ab9-a465-334cf8a80308 | billing.invoices.view.list | true | 40 |
| 7fee7759-ae68-4746-b525-da78758512b7 | Reports | /billing/reports | 460e277e-66e4-4ab9-a465-334cf8a80308 | billing.reports.view.summary | true | 50 |
| b001aa90-2840-423f-9b0f-31a3201361ac | Settings | /billing/settings | 460e277e-66e4-4ab9-a465-334cf8a80308 | core.system.config.view | true | 60 |
| 411604e8-78f4-496e-9328-5eeb1d9bfc36 | Monitoring | /billing/monitoring | 460e277e-66e4-4ab9-a465-334cf8a80308 | attendance.monitoring.view.live_status | true | 70 |
| 8c0fc2a6-2cee-4174-aa5c-289749881736 | Tripay Health | /billing/tripay-health | 460e277e-66e4-4ab9-a465-334cf8a80308 | attendance.monitoring.view.live_status | true | 80 |
| 4401db77-5ef8-4dd2-8e0b-5a0d68529da0 | Tripay Simulator | /billing/tripay-simulator | 460e277e-66e4-4ab9-a465-334cf8a80308 | billing.invoices.view.list | true | 90 |
| 0a3a7eef-9eda-4b9f-bea9-ebe294cf0968 | Overview | /superadmin/intelligence | 8df56f52-d6e0-4d02-814f-e54dfd665c22 | core.tenants.view.list | true | 10 |
| 08d8fb43-176c-4f06-a489-cdbddf583d07 | Revenue Intelligence | /superadmin/intelligence/revenue | 8df56f52-d6e0-4d02-814f-e54dfd665c22 | core.tenants.view.list | true | 20 |
| 7baf0a72-9592-45d6-8dbc-a291f1892099 | Upgrade Intelligence | /superadmin/intelligence/upgrade | 8df56f52-d6e0-4d02-814f-e54dfd665c22 | core.tenants.view.list | true | 30 |
| 1ec3ca3d-f214-48fc-8baa-abcc81578ec2 | Infra Control Center | /superadmin/infra/jobs | 8df56f52-d6e0-4d02-814f-e54dfd665c22 | core.tenants.view.list | true | 40 |
| 9c190fd9-4a57-43eb-9b73-3b0ec2b5467f | Tenants | /tenants |  | core.tenants.view.list | true | 1 |
| d9f32265-0b38-4256-ba59-52407d8ce358 | Revenue | /superadmin/revenue |  | superadmin.revenue.view.overview | true | 2 |
| 8df56f52-d6e0-4d02-814f-e54dfd665c22 | Intelligence | /menu/intelligence |  |  | true | 10 |
| 460e277e-66e4-4ab9-a465-334cf8a80308 | Billing Console | /menu/billing-console |  |  | true | 20 |
| 34407027-56b4-4623-bd58-2016e0c3ec4c | System Management | /menu/system-management |  |  | true | 30 |

### 1.2 Tabel data mentah (PLATFORM, is_active=false) — legacy `/platform/*`

Menu berikut masih ada di database namun sudah dinonaktifkan (hasil alignment dari namespace `/platform/*` ke path lama).

| id | name | path | parent_id | required_capability | is_active | order |
|---|---|---|---|---|---|---|
| 1fbf6b0d-b65d-4260-a1ac-554d9ae2d141 | Platform Dashboard | /platform/dashboard | fb3dba40-982b-4e23-9a78-14c474baa025 | dashboard.view.platform | false | 10 |
| 9c079962-747e-497a-b4c7-bf4158a38959 | Tenants | /platform/tenants | fb3dba40-982b-4e23-9a78-14c474baa025 | platform.tenants.view.list | false | 20 |
| a90c8610-71b6-403c-8b1c-66a34cb72ae2 | Subscriptions | /platform/subscriptions | fb3dba40-982b-4e23-9a78-14c474baa025 | billing.subscriptions.view | false | 30 |
| bc914442-fdbc-4d67-b45f-7ff7464bf74a | Invoices | /platform/invoices | fb3dba40-982b-4e23-9a78-14c474baa025 | billing.invoices.view | false | 40 |
| 2adf2b08-e3df-4aa2-918f-a290a545cb90 | Revenue | /platform/revenue | fb3dba40-982b-4e23-9a78-14c474baa025 | billing.revenue.view | false | 50 |
| 5e480e8b-3715-4547-9652-836b6d786c4b | Workers | /platform/workers | fb3dba40-982b-4e23-9a78-14c474baa025 | system.workers.view | false | 60 |
| 0b0525d4-88f3-43e8-9799-8756a24edd8c | System Health | /platform/health | fb3dba40-982b-4e23-9a78-14c474baa025 | system.health.view | false | 70 |
| e5149336-afd9-45bd-bccf-30cc4d2a0120 | Logs | /platform/logs | fb3dba40-982b-4e23-9a78-14c474baa025 | system.logs.view | false | 80 |
| d8ebf697-449f-48b8-93cc-92713840007b | Feature Flags | /platform/feature-flags | fb3dba40-982b-4e23-9a78-14c474baa025 | system.feature_flags.manage | false | 90 |
| fb3dba40-982b-4e23-9a78-14c474baa025 | Platform | /platform |  |  | false | 1 |

### 1.3 Tree structure menu (aktif)

- Tenants
- Revenue
- Intelligence
  - Overview
  - Revenue Intelligence
  - Upgrade Intelligence
  - Infra Control Center
- Billing Console
  - Billing Dashboard
  - Plans
  - Subscriptions
  - Invoices
  - Reports
  - Settings
  - Monitoring
  - Tripay Health
  - Tripay Simulator
- System Management
  - Role Management
  - Menu Management
  - Infrastructure

---

## 2) Mapping Menu → Capability (aktif)

| Menu | Path | Required Capability |
|---|---|---|
| Tenants | /tenants | core.tenants.view.list |
| Revenue | /superadmin/revenue | superadmin.revenue.view.overview |
| Intelligence | /menu/intelligence | (group / null) |
| Overview | /superadmin/intelligence | core.tenants.view.list |
| Revenue Intelligence | /superadmin/intelligence/revenue | core.tenants.view.list |
| Upgrade Intelligence | /superadmin/intelligence/upgrade | core.tenants.view.list |
| Infra Control Center | /superadmin/infra/jobs | core.tenants.view.list |
| Billing Console | /menu/billing-console | (group / null) |
| Billing Dashboard | /billing/dashboard | dashboard.view.financial_summary |
| Plans | /billing/plans | billing.plans.view.list |
| Subscriptions | /billing/subscriptions | billing.subscriptions.view.active |
| Invoices | /billing/invoices | billing.invoices.view.list |
| Reports | /billing/reports | billing.reports.view.summary |
| Settings | /billing/settings | core.system.config.view |
| Monitoring | /billing/monitoring | attendance.monitoring.view.live_status |
| Tripay Health | /billing/tripay-health | attendance.monitoring.view.live_status |
| Tripay Simulator | /billing/tripay-simulator | billing.invoices.view.list |
| System Management | /menu/system-management | (group / null) |
| Role Management | /management/roles | core.users.view.roles |
| Menu Management | /management/menus | core.menu.view.list |
| Infrastructure | /superadmin/infra | superadmin.infra.view.socket_global |

Catatan:
- Tidak terdeteksi capability “legacy” (semua mengikuti action catalog canonical saat ini).

---

## 3) Capability Availability Check (Permission table)

Hasil check:
- Capability used by PLATFORM menu tetapi tidak ada di tabel `Permission`: tidak ada (0).

---

## 4) Router Path Audit (Frontend)

Sumber routing:
- [App.tsx](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L470-L686)

Status route untuk setiap path PLATFORM (aktif):
- `/tenants` → YES (Route ada) [App.tsx:L493-L502](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L493-L502)
- `/superadmin/revenue` → YES [App.tsx:L534-L538](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L534-L538)
- `/superadmin/intelligence` → YES [App.tsx:L519-L523](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L519-L523)
- `/superadmin/intelligence/revenue` → YES [App.tsx:L524-L528](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L524-L528)
- `/superadmin/intelligence/upgrade` → YES [App.tsx:L529-L533](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L529-L533)
- `/superadmin/infra/jobs` → YES [App.tsx:L514-L518](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L514-L518)
- `/superadmin/infra` → YES [App.tsx:L503-L513](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L503-L513)
- `/billing/dashboard` → YES [App.tsx:L400-L405](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L400-L405)
- `/billing/plans` → YES [App.tsx:L406-L411](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L406-L411)
- `/billing/subscriptions` → YES [App.tsx:L412-L416](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L412-L416)
- `/billing/invoices` → YES (redirect ke `/invoice/list`) [App.tsx:L470-L479](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L470-L479)
- `/billing/reports` → YES [App.tsx:L458-L463](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L458-L463)
- `/billing/settings` → YES [App.tsx:L441-L447](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L441-L447)
- `/billing/monitoring` → YES [App.tsx:L465-L468](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L465-L468)
- `/billing/tripay-health` → YES [App.tsx:L448-L452](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L448-L452)
- `/billing/tripay-simulator` → YES [App.tsx:L453-L457](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L453-L457)
- `/management/menus` → YES [App.tsx:L667-L671](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L667-L671)
- `/management/roles` → YES [App.tsx:L672-L676](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/frontend/absenta_frontend/src/App.tsx#L672-L676)

Path grouping (parent menu) yang tidak memiliki route frontend:
- `/menu/intelligence` → NO (group node)
- `/menu/billing-console` → NO (group node)
- `/menu/system-management` → NO (group node)

Catatan: ini tidak salah untuk struktur sidebar (group node), tetapi jika UI memperlakukan parent sebagai clickable link, akan menghasilkan 404/redirect.

---

## 5) Domain Classification

Klasifikasi menu PLATFORM (aktif):
- TENANT_MANAGEMENT: Tenants
- BILLING: Billing Console (Billing Dashboard, Plans, Subscriptions, Invoices, Reports, Settings, Tripay Simulator)
- OBSERVABILITY: Intelligence (Overview, Revenue Intelligence, Upgrade Intelligence), Monitoring, Tripay Health
- INFRASTRUCTURE: Infrastructure, Infra Control Center
- ADMINISTRATION: Role Management, Menu Management
- NOTIFICATIONS: (tidak ada item khusus platform saat ini)

---

## 6) Duplicate Domain Detection

Temuan duplikasi domain (secara arsitektur, bukan duplikasi record):
- Revenue (`/superadmin/revenue`) berada di root terpisah, namun secara domain lebih dekat ke BILLING/financial (berpotensi overlap dengan Billing Console).
- Monitoring & Tripay Health berada di Billing Console, namun secara domain lebih dekat ke OBSERVABILITY (health/monitoring).

---

## 7) Tenant Menu Leak Check (SUPERADMIN)

Test:
- Login SUPERADMIN lalu panggil `GET /api/menu/sidebar` dengan header `x-skip-tenant: true` (dev localhost).

Hasil:
- Root: `Tenants, Revenue, Intelligence, Billing Console, System Management`
- Tenant leak: tidak ada (Dashboard/Layanan/Akademik/Absensi/Koperasi/Langganan Saya tidak muncul)

---

## 8) Sidebar Depth Analysis

Perhitungan kedalaman tree (aktif):
- max_depth = 2

Nilai ini berada dalam batas ideal (<= 3).

