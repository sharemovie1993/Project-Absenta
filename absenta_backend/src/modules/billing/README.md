# MODULE BILLING & SUBSCRIPTION

## Deskripsi
Modul Billing & Subscription adalah jantung komersial platform Absenta.id yang mengelola siklus hidup pelanggan SaaS. Modul ini menggunakan pendekatan **Hybrid Plan Sourcing** di mana definisi paket dapat diambil secara real-time dari server lisensi eksternal atau melalui basis data lokal sebagai cadangan (fallback).

## Aktor & Peran
- **System Superadmin**: Pengelola paket (plans), pemantau kesehatan billing sistem, dan verifikator pembayaran manual.
- **Admin Sekolah (Tenant Owner)**: Pengguna yang melakukan pemilihan paket, pemantauan status langganan, dan riwayat invoice.
- **Tenant User**: Pengguna akhir yang hak akses fiturnya (Entitlement) ditentukan oleh status langganan aktif tenant.

## Sub-Modul & Fitur Terimplementasi

### 1. Plan Management (Hybrid Sync)
- **External License Sync**: Integrasi otomatis dengan `LICENSE_SERVER_URL` untuk sinkronisasi paket harga, fitur, dan limitasi perangkat.
- **Tiering System**: Kategorisasi paket secara otomatis menjadi `Micro`, `Small`, `Medium`, `Large`, atau `Enterprise` berdasarkan batasan jumlah pengguna/perangkat.
- **Absensi Mode Binding**: Paket dapat secara otomatis menentukan mode operasional modul Attendance (`SIMPLE` atau `MULTI_SESI`).

### 2. Subscription & Entitlements
- **Feature Resolution**: Engine cerdas yang memetakan paket langganan aktif menjadi daftar fitur (Capabilities) yang tersedia untuk tenant, mendukung agregasi fitur dari data *plan snapshot* dan master data plan.
- **Redis Caching**: Optimasi performa resolusi fitur menggunakan cache Redis dengan TTL 60 detik per tenant.
- **Trial System**: Mendukung skema *free trial* dengan pembatasan satu kali per layanan untuk mencegah penyalahgunaan.
- **Change Management**: Sistem antrean untuk perubahan paket (Upgrade/Downgrade) dan pembatalan langganan terjadwal.
- **Core Grant**: Sistem menjamin fitur `CORE` selalu tersedia bagi setiap tenant terdaftar terlepas dari status paket tambahan.

### 3. Billing & Invoicing
- **Invoice Lifecycle**: Manajemen status invoice mulai dari `UNPAID`, `PAID`, hingga `OVERDUE`.
- **Financial Metrics**: Dashboard pendapatan (Revenue) yang mencakup metrik 30 hari terakhir, pertumbuhan bulanan, dan tingkat kegagalan pembayaran.
- **Health Summary**: Pemantauan integritas sistem billing (Invoice tanpa pembayaran, pembayaran belum diaplikasikan, kegagalan webhook).

### 4. Integration & Gateway
- **Payment Gateway Ready**: Arsitektur yang mendukung integrasi dengan Midtrans, Xendit, dan Stripe.
- **Event-Driven Reconciliation**: Penyesuaian otomatis status langganan berdasarkan event pembayaran yang diterima sistem.

## Teknologi & Pattern
- **Pattern**: Command/Query Separation (CQS), Hybrid Data Sourcing, Entitlement Engine.
- **Performance**: Redis-based caching untuk permission resolution.
- **Reliability**: Fallback mechanism untuk pengambilan data paket dari database lokal jika API eksternal gagal.
