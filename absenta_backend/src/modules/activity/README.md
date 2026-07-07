# MODULE ACTIVITY LOG

## Deskripsi
Modul Activity Log adalah layanan internal platform Absenta.id yang mengelola pencatatan riwayat aktivitas pengguna untuk kebutuhan kepatuhan hukum (*compliance*) dan audit internal. Modul ini mencatat data aksi penting (Create, Update, Delete) yang dilakukan oleh pengguna di tingkat platform maupun tenant.

## Aktor & Peran
- **System Superadmin**: Memantau log aktivitas di tingkat infrastruktur dan lintas tenant.
- **Admin Sekolah (Tenant Admin)**: Memantau log aktivitas staf, guru, dan admin di dalam tenant terkait.

## Sub-Modul & Fitur Terimplementasi
### 1. Activity Logging Engine
- **Log Capturer**: Middleware/Service untuk menangkap detail request seperti user agent, IP address, modul yang diakses, jenis aksi, dan timestamp.
- **Tenant Isolation log**: Penyaringan otomatis pencatatan log agar terikat secara aman pada `tenant_id` masing-masing.
- **GET /**: Endpoint untuk mengambil log aktivitas tenant dengan paginasi dan filter periode.

## Teknologi & Pattern
- **Pattern**: Service Layer Logging, Strict Isolation.
- **Database**: Prisma ORM dengan tabel `ActivityLog` ter-indeks pada `tenant_id` dan `created_at`.
