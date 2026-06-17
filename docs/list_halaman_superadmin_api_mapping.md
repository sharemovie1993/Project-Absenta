# Pemetaan Rute API Superadmin & Otorisasi Kapabilitas Absenta.id

Dokumen resmi inventarisasi yang memetakan setiap halaman frontend superadmin ke rute API backend beserta penegakan token kapabilitas granular (`requireCapability`) masing-masing.

---

## 🏢 1. Manajemen Tenant & Pengguna (Tenant & User Management)
*   **Halaman Frontend**: `/tenants` (Daftar Tenant) & `/tenants/:tenantId` (Detail Tenant)
*   **File Rute Backend**: `absenta_backend/src/modules/superadmin/tenant-detail/routes/tenant-detail.routes.ts`
*   **Path Base API**: `/api/v1/superadmin/tenants`

| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/:tenantId` | Mengambil detail lengkap tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/metrics` | Mengambil metrics dashboard tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/activities` | Mengambil log aktivitas terbaru tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/user-statistics` | Mengambil statistik pengguna tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/users` | Mengambil daftar pengguna tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **POST** | `/:tenantId/users` | Membuat pengguna baru dalam tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **PUT** | `/:tenantId/users/:userId` | Memperbarui data pengguna tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **DELETE** | `/:tenantId/users/:userId` | Menghapus pengguna dari tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/academic` | Mengambil data akademik tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/attendance` | Mengambil data monitoring absensi | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/billing` | Mengambil detail billing/invoice tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/logs` | Mengambil activity logs tenant | `superadmin.tenants.manage` | ✅ Terproteksi |
| **GET** | `/:tenantId/export` | Ekspor data lengkap tenant (JSON/CSV) | `superadmin.tenants.manage` | ✅ Terproteksi |

---

## ⚙️ 2. Pusat Kontrol Infrastruktur (Infra Control Center)
*   **Halaman Frontend**: `/superadmin/infra` (Dasbor Websocket) & `/superadmin/infra/jobs` (Job Monitoring)
*   **File Rute Backend**:
    *   `absenta_backend/src/modules/superadmin/infra/routes/infra.routes.ts`
    *   `absenta_backend/src/modules/superadmin/infra-monitoring/routes/infra-monitoring.routes.ts`

### websocket Monitoring (`/api/v1/superadmin/infra`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/socket/global` | Status koneksi socket global platform | `superadmin.infra.view.socket.global` | ✅ Terproteksi |
| **GET** | `/socket/tenants` | Distribusi koneksi socket per tenant | `superadmin.infra.view.socket.tenants` | ✅ Terproteksi |

### Background Job & Worker Queue (`/api/v1/superadmin/infra-monitoring`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/jobs` | Menampilkan seluruh antrean pekerjaan | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **GET** | `/jobs/:name` | Mengambil detail info job spesifik | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **POST** | `/jobs/:name/run` | Menjalankan paksa job tertentu | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **GET** | `/queues` | Menampilkan queue status BullMQ | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **POST** | `/queues/:name/pause` | Memberhentikan sementara antrean job | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **POST** | `/queues/:name/resume` | Melanjutkan kembali antrean job | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **GET** | `/health` | Status kesehatan Redis & queue workers | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **GET** | `/workers` | Daftar worker threads platform | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **GET** | `/cluster/nodes` | Status cluster server / VM nodes | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **POST** | `/workers/start` | Mengaktifkan thread worker baru | `superadmin.infra.monitoring.view` | ✅ Terproteksi |
| **POST** | `/workers/stop` | Mematikan thread worker aktif | `superadmin.infra.monitoring.view` | ✅ Terproteksi |

---

## 💰 3. Pengelolaan Paket & Berlangganan SaaS (SaaS Billing & Plans)
*   **Halaman Frontend**: `/billing/plans` (Plans Management) & `/billing/subscriptions` (Langganan Tenant)
*   **File Rute Backend**:
    *   `absenta_backend/src/modules/billing/routes/plan.routes.ts`
    *   `absenta_backend/src/modules/billing/routes/subscription.routes.ts`

### Plans / Paket SaaS (`/api/v1/billing/plans`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Mengambil seluruh katalog paket SaaS | `billing.plans.view.list` | ✅ Terproteksi |
| **GET** | `/analytics` | Analisis popularitas paket SaaS | `billing.plans.view.list` | ✅ Terproteksi |
| **GET** | `/:id` | Detail spesifikasi paket SaaS | `billing.plans.view.detail` | ✅ Terproteksi |
| **POST** | `/` | Membuat paket langganan SaaS baru | `billing.plans.create` | ✅ Terproteksi |
| **PUT** | `/:id` | Memperbarui tarif/limit paket SaaS | `billing.plans.update` | ✅ Terproteksi |
| **DELETE** | `/:id` | Menonaktifkan paket berlangganan | `billing.plans.delete` | ✅ Terproteksi |

### Subscriptions / Riwayat Langganan (`/api/v1/billing/subscriptions`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Seluruh data langganan aktif platform | `billing.subscriptions.view.list` | ✅ Terproteksi |
| **GET** | `/tenant/:tenant_id` | Riwayat paket langganan per sekolah | `billing.subscriptions.view.list` | ✅ Terproteksi |
| **GET** | `/:id` | Detail metadata invoice langganan | `billing.subscriptions.view.detail` | ✅ Terproteksi |
| **POST** | `/` | Mengaktifkan langganan manual | `billing.subscriptions.create` | ✅ Terproteksi |
| **PUT** | `/:id` | Memperbarui siklus tagihan manual | `billing.subscriptions.update` | ✅ Terproteksi |
| **POST** | `/:id/cancel` | Membatalkan langganan sekolah | `billing.subscriptions.cancel` | ✅ Terproteksi |
| **POST** | `/check-expired` | Trigger manual scheduler check expired | `billing.subscriptions.check.expired` | ✅ Terproteksi |

---

## 🛡️ 4. Konfigurasi Sistem, Peran, & Menu (System Governance)
*   **Halaman Frontend**: `/management/menus` (Pohon Menu) & `/management/roles` (Granular RBAC)
*   **File Rute Backend**:
    *   `absenta_backend/src/modules/menu/controllers/menu.controller.ts`
    *   `absenta_backend/src/modules/user/controllers/user.controller.ts`

| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/core/menus` | Menambahkan item navigasi menu baru | `core.menu.roles.update` | ✅ Terproteksi |
| **PUT** | `/api/v1/core/menus/:id` | Mengubah susunan / link menu sidebar | `core.menu.roles.update` | ✅ Terproteksi |
| **DELETE** | `/api/v1/core/menus/:id` | Menghapus navigasi menu dari sistem | `core.menu.roles.update` | ✅ Terproteksi |
| **POST** | `/api/v1/core/users/roles` | Membuat role kustom di tenant/platform | `core.users.roles.create` | ✅ Terproteksi |
| **PUT** | `/api/v1/core/users/roles/:id` | Memetakan capability baru ke role | `core.users.roles.permissions.update` | ✅ Terproteksi |

---

## 📊 5. Analisis Kecerdasan Bisnis (Business Intelligence)
*   **Halaman Frontend**: `/superadmin/intelligence` (Overview), `/superadmin/intelligence/revenue` (Proyeksi MRR), `/superadmin/intelligence/upgrade` (Funnel Leads)
*   **File Rute Backend**:
    *   `absenta_backend/src/modules/superadmin/infra/routes/platformIntelligence.routes.ts`
    *   `absenta_backend/src/modules/revenue/routes/revenue-admin.routes.ts`
    *   `absenta_backend/src/modules/upgrade-intelligence/routes/upgrade-intelligence-admin.routes.ts`

### Platform Intelligence (`/api/v1/superadmin`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/overview` | Statistik user aktif & growth platform | `superadmin.platform.intelligence.view` | ✅ Terproteksi |
| **GET** | `/top-risk` | Analisis churn-risk tenant/sekolah | `superadmin.platform.intelligence.view` | ✅ Terproteksi |
| **GET** | `/email-health` | Latensi SMTP & rasio pengiriman email | `superadmin.platform.intelligence.view` | ✅ Terproteksi |

### Revenue Intelligence (`/api/v1/revenue`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/overview` | Total pendapatan, MRR, dan ARR | `superadmin.revenue.view.overview` | ✅ Terproteksi |
| **GET** | `/trend` | Grafik bulanan arus kas dana masuk | `superadmin.revenue.view.overview` | ✅ Terproteksi |

### Upgrade Intelligence (`/api/v1/upgrade-intelligence`)
| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/overview` | Funnel konversi dari free-tier ke premium | `superadmin.upgrade.intelligence.view` | ✅ Terproteksi |
| **GET** | `/tenant/:tenantId/:month` | Analisis score kesiapan upgrade tenant | `superadmin.upgrade.intelligence.view` | ✅ Terproteksi |

---

## 💾 6. Keamanan & Cadangan Data (Security & Backups)
*   **Halaman Frontend**: `/superadmin/backups` (System Backups)
*   **File Rute Backend**: `absenta_backend/src/modules/backup/routes/backup.routes.ts`
*   **Path Base API**: `/api/v1/backup/admin/backups`

| Method | Rute Backend Endpoint | Deskripsi Fungsi | Token Kapabilitas (Capability) | Status Proteksi |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Menampilkan seluruh snapshot cadangan | `cadangan.view.cadangan` | ✅ Terproteksi |
| **GET** | `/:id/download` | Mengunduh file SQL dump snapshot DB | `cadangan.view.cadangan` | ✅ Terproteksi |
| **POST** | `/:id/restore` | Melakukan restore database platform | `cadangan.manage.cadangan` | ✅ Terproteksi |
