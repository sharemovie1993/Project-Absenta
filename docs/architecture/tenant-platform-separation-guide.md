# Panduan Arsitektur: Integrasi Tenant-App & Server-Lisensi (Separasi Platform)

Panduan ini mendefinisikan arsitektur pemisahan antara **Project Absenta** (Tenant-App ERP) dan **Project-Server-Lisensi** (Pusat Kontrol & SaaS Platform) yang berjalan di server terpisah.

---

## 1. Peta Pembagian Tanggung Jawab (Responsibility Map)

Dengan memindahkan modul platform ke Server Lisensi, masing-masing proyek akan memiliki tanggung jawab yang spesifik dan bersih:

```
+------------------------------------------+       +------------------------------------------+
|       PROJECT ABSENTA (Tenant-App)       |       |     PROJECT-SERVER-LISENSI (Central)     |
|         (On-Premise di Sekolah)          |       |           (Cloud VPS Central)            |
+------------------------------------------+       +------------------------------------------+
|  - Academic Core (Siswa, Guru, Kurikulum)|       |  - License Key & Device Activation       |
|  - Attendance Engine (RFID, Face, IoT)   |  API  |  - Plan Management & SaaS Subscriptions  |
|  - Student Care (BPBK Counseling & EWS)  |======>|  - Central Invoicing & Payments (Stripe) |
|  - Cooperative ERP (POS & RFID Cashless) |       |  - Global Platform Analytics & Revenue   |
|  - SARPRAS (Inventory, Borrowing)        |       |  - Tenant Risk Score (Risk Intelligence) |
|  - Local WhatsApp Gateway (Baileys Pool) |       |  - Easy-Tunnel (VPN Server Controller)   |
|  - Client Support Ticket (Kirim Keluhan) |       |  - Support Ticket Central Desk (Agent)   |
+------------------------------------------+       +------------------------------------------+
```

### Klasifikasi Peran Modul (Module Mapping)

Berikut adalah pemetaan seluruh 39 modul backend saat ini ke dalam tiga kategori: **Tenant-Only (On-Premise)**, **Platform-Only (Central SaaS)**, dan **Shared/Hybrid (Shared Code)**.

| Nama Modul | Kategori | Alasan & Perilaku dalam Arsitektur Baru |
| :--- | :---: | :--- |
| **academic** | **Tenant-Only** | Inti KBM harian (Siswa, Guru, Kelas). Wajib berjalan offline di server lokal sekolah. |
| **attendance** | **Tenant-Only** | Absensi RFID/Face IoT yang membutuhkan latensi rendah dan otonomi lokal penuh. |
| **bpbk** | **Tenant-Only** | Bimbingan konseling dan catatan kasus BK internal sekolah (sifatnya konfidensial lokal). |
| **kesiswaan** | **Tenant-Only** | Pencatatan ketertiban, poin pelanggaran, prestasi, dan piket harian. |
| **kurikulum** | **Tenant-Only** | Manajemen mapel, struktur kurikulum, dan jadwal supervisi guru. |
| **cooperative** | **Tenant-Only** | Transaksi POS ritel kantin, simpan-pinjam, dan pembayaran RFID cashless lokal. |
| **sarpras** | **Tenant-Only** | Manajemen inventaris sekolah, log peminjaman aset fisik, dan habis pakai. |
| **correspondence** | **Tenant-Only** | Surat-menyurat TU, penomoran lokal, dan alur disposisi internal. |
| **parent-app** | **Tenant-Only** | Portal API stateless untuk memfasilitasi aplikasi mobile orang tua memantau anaknya. |
| **sekolah** | **Tenant-Only** | Informasi profil sekolah, NPSN, dan setelan operasional lokal. |
| **whatsapp** | **Tenant-Only** | Driver gateway WhatsApp lokal sekolah (terkoneksi langsung ke nomor WA sekolah via Baileys). |
| **jadwal** | **Tenant-Only** | Helper validasi bentrok jadwal KBM lokal sebelum di-save. |
| **jobdesk** | **Tenant-Only** | Pembagian tupoksi guru dan staf di lingkungan internal sekolah. |
| **support-ticket (Client)** | **Tenant-Only** | UI / API di sisi lokal untuk mengirimkan tiket keluhan bug/fitur ke server pusat. |
| **system-config (Tenant)** | **Tenant-Only** | Konfigurasi lokal (TTL cache absensi, batas stok minimum sarpras, dll). |
| **backup (Local)** | **Tenant-Only** | Pencadangan data sekolah mandiri ke format JSON untuk recovery lokal. |
| **dashboard (Local)** | **Tenant-Only** | Dashboard metrik operasional harian sekolah untuk Kepsek/Guru. |
| **auth (Tenant)** | **Shared** | Autentikasi user lokal (Guru, Siswa, Admin Sekolah) menggunakan JWT lokal. |
| **user (Tenant)** | **Shared** | Manajemen user account lokal dan role-capabilities sekolah. |
| **menu (Tenant)** | **Shared** | Rendering sidebar navigasi lokal sekolah berdasarkan role-capabilities lokal. |
| **notification (Tenant)** | **Shared** | Distribusi email/WA internal sekolah (misal: "Anak Anda sudah masuk gerbang"). |
| **upload** | **Shared** | Utility upload file. Lokal menyimpan foto siswa/kerusakan aset; Pusat menyimpan berkas template. |
| **pdf** | **Shared** | Engine Puppeteer. Lokal me-render kartu pelajar/sertifikat; Pusat me-render invoice. |
| **document-center** | **Shared** | Penyimpanan dokumen umum (portofolio siswa vs. MoU platform). |
| **activity (Local)** | **Shared** | Logging audit trail lokal untuk kepatuhan operasional sekolah. |
| **audit (Local)** | **Shared** | Log audit keamanan server lokal. |
| **billing** | **Platform-Only** | Siklus langganan, plan rates, dan entitlement generator. **Wajib ada di pusat**. |
| **finance** | **Platform-Only** | Pencatatan refund transaksi platform dan double-entry bookkeeping platform. |
| **analytics** | **Platform-Only** | Cohort retention tenant, forecasting pendapatan platform, dan tren SaaS global. |
| **revenue** | **Platform-Only** | Pendapatan platform (ARR, MRR, ARPU) lintas seluruh instans. |
| **risk** | **Platform-Only** | Deteksi risiko (Risk Score) keaktifan tenant dan kesehatan server lokal. |
| **upgrade-intelligence** | **Platform-Only** | Analisis kecenderungan upgrade plan tenant untuk promosi platform. |
| **easy-tunnel** | **Platform-Only** | Penyediaan proxy VPN Wireguard untuk me-remote server on-premise sekolah. |
| **superadmin** | **Platform-Only** | Manajemen data master tenant global, monitor BullMQ cluster, dan visualisasi load infra. |
| **support-ticket (Agent)** | **Platform-Only** | Konsol helpdesk pusat untuk agen support platform membalas tiket masuk dari tenant. |
| **tenant** | **Platform-Only** | Database master lisensi tenant, status suspension, dan registrasi domain. |
| **system-config (Central)** | **Platform-Only** | Konfigurasi platform global (License API Keys, global rate limiter). |
| **observability** | **Platform-Only** | Alarm kesehatan sistem, logs aggregator, dan crash alerts. |

---

## 2. Alur Integrasi Antar Server (Cross-Server Communication)

Karena kedua proyek ini akan dipasang di server berbeda, interaksi dilakukan menggunakan **REST API** dengan proteksi **API Key Handshake** dan **HMAC Webhooks**.

### A. Alur 1: Pengecekan Lisensi Lokal (Pull Mode)
1. Setiap hari, **Tenant-App** lokal mengirim request ke **Server-Lisensi**:
   `GET https://lisensi.absenta.id/api/license/verify` dengan header `X-License-Key`.
2. **Server-Lisensi** mengecek validitas kunci dan membalas dengan status langganan beserta daftar modul aktif (*entitlements*).
3. **Tenant-App** menyimpan respons tersebut di cache database lokal untuk izin akses menu. Jika internet mati, tenant-app masuk ke *Grace Period* (maksimal 7 hari offline) sebelum mengunci fitur non-core.

### B. Alur 2: Pengiriman Metrik Aktivitas & Risiko (Heartbeat Push)
1. **Tenant-App** menjalankan cron job harian yang mengagregasikan statistik lokal (jumlah siswa login, memori server, transaksi POS).
2. Data dikirim ke **Server-Lisensi**:
   `POST https://lisensi.absenta.id/api/platform/heartbeat` dengan payload terenkripsi.
3. Di **Server-Lisensi**, modul `risk` (Risk Score) dan `upgrade-intelligence` memproses payload ini untuk mendeteksi keaktifan sekolah dan menyimpannya di tabel analitik pusat.

### C. Alur 3: Penanganan Tiket Bantuan (Support Ticket Proxy)
1. Admin sekolah menulis tiket keluhan di dasbor lokal sekolah.
2. Backend **Tenant-App** mem-proxy input tersebut ke **Server-Lisensi**:
   `POST https://lisensi.absenta.id/api/tickets/create` menggunakan API token tenant.
3. Agen platform membalas tiket di Server-Lisensi. Setiap kali halaman bantuan dimuat di Tenant-App, ia akan me-request pesan terbaru secara real-time ke Server-Lisensi.

---

## 3. Langkah Migrasi Modul (Step-by-Step Migration Steps)

### Langkah 1: Pemindahan Modul dari Absenta ke Server-Lisensi
Salin modul platform berikut dari `absenta_backend/src/modules/` ke `Project-Server-Lisensi/src/`:
1. **`easy-tunnel`**: Pindahkan service dan controller management VPN. Server Lisensi yang memiliki IP publik bertindak sebagai koordinator WireGuard.
2. **`analytics` & `revenue`**: Pindahkan kalkulasi kohort retention dan forecasting pendapatan.
3. **`risk` & `upgrade-intelligence`**: Pindahkan engine kalkulasi risiko dan potensi upsell.
4. **`support-ticket` (Bagian Admin)**: Buat routes baru khusus agen support untuk membalas keluhan.

### Langkah 2: Pembaruan Skema Database Server-Lisensi
Tambahkan tabel pendukung di [schema.prisma Server-Lisensi](file:///d:/BarayaProject/Project-Server-Lisensi/prisma/schema.prisma) untuk mendukung analitik baru:
- Tabel `TenantMetrics` (untuk menampung kiriman data heartbeat).
- Tabel `PlatformRisk` (menyimpan level risiko per sekolah).
- Tabel `SupportTicket` dan `TicketMessage` (untuk desk bantuan pusat).

Jalankan migrasi di Server-Lisensi:
```bash
npx prisma migrate dev --name add_platform_modules
```

### Langkah 3: Pembersihan Codebase Tenant-App (Project Absenta)
Setelah modul berhasil berjalan di Server-Lisensi, lakukan pembersihan di backend sekolah:
1. Hapus folder modul `analytics`, `revenue`, `risk`, `upgrade-intelligence`, dan `easy-tunnel`.
2. Pada modul `billing`, hapus rute yang membuat invoice lokal dan ganti dengan *Axios client* yang mengarah ke Server-Lisensi.
3. Modifikasi module loader (`app.ts`) agar tidak me-load modul platform-only yang telah dihapus.

---

## 4. Pemisahan & Pengamanan Frontend (Frontend Hardening)

Pada sisi **`absenta_frontend`** (React + Vite), halaman superadmin/platform (seperti `InfrastructureDashboard`, `TenantDetailPage`, `UpgradeIntelligencePage`) tidak boleh terekspos ke bundle *dist* sekolah lokal untuk mencegah kebocoran Kekayaan Intelektual (IP) dan manipulasi JavaScript sisi klien.

Kami menyarankan **Strategi Build-Time Feature Flags & Tree Shaking**:

### A. Penggunaan Environment Variable
Gunakan variabel `VITE_DEPLOY_MODE` pada berkas `.env` saat melakukan proses build:
- **Di Server Sekolah (On-Premise)**:
  `VITE_DEPLOY_MODE=ON_PREMISE`
- **Di Server Pusat (Cloud SaaS Platform)**:
  `VITE_DEPLOY_MODE=CENTRAL_SAAS`

### B. Penyaringan Rute Dinamis (Dynamic Routing)
Pada konfigurasi router utama React (`App.tsx` atau `routes.tsx`), saring rute superadmin secara kondisional:

```typescript
// App.tsx
const deployMode = import.meta.env.VITE_DEPLOY_MODE;

const routes = [
  // Rute operasional sekolah (Selalu aktif)
  { path: '/academic', element: <AcademicDashboard /> },
  { path: '/attendance', element: <AttendanceDashboard /> },
  
  // Rute Superadmin (Hanya diregistrasikan di server pusat)
  ...(deployMode === 'CENTRAL_SAAS' ? [
    {
      path: '/superadmin',
      element: <SuperAdminLayout />,
      children: [
        { path: 'infra', lazy: () => import('./pages/superadmin/infra/InfrastructureDashboard') },
        { path: 'tenants', lazy: () => import('./pages/superadmin/TenantDetailPage') }
      ]
    }
  ] : [])
];
```

### C. Efek Tree Shaking Rollback
Dengan menggunakan dynamic import (`lazy: () => import(...)`) dan menyaring rute secara kondisional, compiler Vite (Rollup) secara otomatis akan **memotong (tree-shaking) seluruh folder `pages/superadmin/`** dan tidak akan men-generate chunk berkas `.js` untuk halaman superadmin tersebut di folder `/dist` instalasi sekolah lokal.

Dengan demikian, kode dasbor platform Anda tetap **100% aman dan tidak bocor** ke instans lokal sekolah tanpa harus memisahkan repositori frontend menjadi dua proyek yang rumit.

