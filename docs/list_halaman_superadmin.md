# Daftar Halaman Superadmin - Absenta.id

Berikut adalah daftar halaman lengkap khusus untuk lingkungan **Superadmin** platform Absenta.id beserta rute URL-nya di frontend:

---

## 🏢 1. Manajemen Tenant & Pengguna (Tenant & User Management)

### Daftar Tenant (Tenants List)
*   **Rute URL**: `/tenants`
*   **Berkas Kode**: `src/pages/tenants/TenantsPage.tsx`
*   **Fungsi**: Menampilkan daftar sekolah/tenant yang terdaftar di platform, status langganan, dan jumlah murid aktif.

### Detail Tenant (Tenant Detail)
*   **Rute URL**: `/tenants/:tenantId`
*   **Berkas Kode**: `src/pages/superadmin/TenantDetailPage.tsx`
*   **Fungsi**: Informasi terperinci per sekolah, termasuk manajemen pengguna, log aktivitas sekolah, statistik kehadiran, riwayat pembayaran, dan riwayat paket langganan.

---

## ⚙️ 2. Pusat Kontrol Infrastruktur (Infra Control Center)

### Dasbor Infrastruktur (Infrastructure Dashboard)
*   **Rute URL**: `/superadmin/infra`
*   **Berkas Kode**: `src/pages/superadmin/infra/InfrastructureDashboard.tsx`
*   **Fungsi**: Monitoring koneksi socket global, status server, dan statistik websocket aktif per tenant.

### Pusat Kontrol Pekerjaan (Infra Control Center / Jobs)
*   **Rute URL**: `/superadmin/infra/jobs`
*   **Berkas Kode**: `src/pages/superadmin/infra/InfraControlCenterPage.tsx`
*   **Fungsi**: Mengelola antrean pekerjaan di server (job queue/background workers) dan log aktivitas jobs.

### Simulator Pembayaran (Tripay Simulator)
*   **Rute URL**: `/superadmin/infra/tripay-simulator`
*   **Berkas Kode**: `src/pages/billing/TripaySimulatorPage.tsx`
*   **Fungsi**: Simulasi callback webhook dari Tripay (payment gateway) untuk mempermudah pengujian alur billing.

### Kesehatan Integrasi (Tripay Health)
*   **Rute URL**: `/superadmin/infra/tripay-health`
*   **Berkas Kode**: `src/pages/billing/TripayHealthPage.tsx`
*   **Fungsi**: Pemantauan latensi, status koneksi API, dan kesehatan integrasi Tripay.

### Monitoring Transaksi Global (Global Billing Monitoring)
*   **Rute URL**: `/superadmin/infra/monitoring`
*   **Berkas Kode**: `src/pages/billing/MonitoringPage.tsx`
*   **Fungsi**: Memantau siklus transaksi dari seluruh tenant, pembayaran pending, dan status tagihan yang aktif.

---

## 💰 3. Pengelolaan Paket & Berlangganan SaaS (SaaS Billing & Plans)

### Manajemen Paket Langganan (SaaS Plans Management)
*   **Rute URL**: `/billing/plans`
*   **Berkas Kode**: `src/pages/billing/PlansPage.tsx`
*   **Fungsi**: Membuat, menyunting, dan menghapus paket langganan SaaS (seperti paket gratis, dasar, premium) beserta spesifikasi harga bulanan/tahunan.

### Manajemen Status Berlangganan Tenant (Subscriptions Management)
*   **Rute URL**: `/billing/subscriptions` (legacy redirect dari `/management/subscriptions`)
*   **Berkas Kode**: `src/pages/billing/SubscriptionsPage.tsx`
*   **Fungsi**: Mengawasi status keaktifan paket berlangganan sekolah, melakukan perpanjangan manual, atau membatalkan langganan.

---

## 🛡️ 4. Konfigurasi Sistem, Peran, & Menu (System Governance)

### Manajemen Menu Navigasi (Menu Management)
*   **Rute URL**: `/management/menus`
*   **Berkas Kode**: `src/pages/management/MenuManagementPage.tsx`
*   **Fungsi**: Menyusun struktur pohon menu navigasi sidebar untuk semua tipe role secara dinamis.

### Manajemen Peran & Kapabilitas (Role & Capability Mapper)
*   **Rute URL**: `/management/roles`
*   **Berkas Kode**: `src/pages/management/RoleManagementPage.tsx`
*   **Fungsi**: Pemetaan dan pengaturan granularity hak akses (capabilities) ke setiap Role pengguna di Absenta.id.

### Log Audit Perubahan Menu (Menu Audit Log)
*   **Rute URL**: `/management/menu-audit`
*   **Berkas Kode**: `src/pages/management/MenuAuditPage.tsx`
*   **Fungsi**: Riwayat catatan log perubahan tata letak dan konfigurasi menu navigasi sistem.

---

## 📊 5. Analisis Kecerdasan Bisnis (Business Intelligence)

### Platform Intelligence (Platform Overview)
*   **Rute URL**: `/superadmin/intelligence`
*   **Berkas Kode**: `src/pages/superadmin/PlatformIntelligencePage.tsx`
*   **Fungsi**: Dashboard analisis performa presensi harian secara global, statistik pengguna aktif, dan rasio retensi platform.

### Revenue Intelligence (Analisis Pendapatan)
*   **Rute URL**: `/superadmin/intelligence/revenue`
*   **Berkas Kode**: `src/pages/superadmin/intelligence/RevenueIntelligencePage.tsx`
*   **Fungsi**: Proyeksi keuangan platform, skenario retensi pembayaran, dan estimasi nilai kontrak tahunan (ARR/MRR).

### Upgrade Intelligence (Analisis Upgrade)
*   **Rute URL**: `/superadmin/intelligence/upgrade`
*   **Berkas Kode**: `src/pages/superadmin/intelligence/UpgradeIntelligencePage.tsx`
*   **Fungsi**: Pemetaan tren sekolah yang ingin melakukan upgrade dari paket gratis ke premium beserta pelacakan leads potensial.

### Dasbor Pendapatan (Revenue Dashboard)
*   **Rute URL**: `/superadmin/revenue`
*   **Berkas Kode**: `src/pages/superadmin/revenue/RevenueDashboardPage.tsx`
*   **Fungsi**: Grafik bulanan/tahunan performa keuangan, total dana masuk, dan kontributor top sekolah.

---

## 💾 6. Keamanan & Cadangan Data (Security & Backups)

### Cadangan Sistem (System Backups)
*   **Rute URL**: `/superadmin/backups`
*   **Berkas Kode**: `src/pages/superadmin/BackupsPage.tsx`
*   **Fungsi**: Mengelola pencadangan database platform secara terjadwal dan log pemulihan sistem.
