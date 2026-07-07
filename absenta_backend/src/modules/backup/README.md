# MODULE BACKUP & RESTORE

## Deskripsi
Modul Backup & Restore menyediakan mekanisme keamanan cadangan data (*disaster recovery*) untuk mem-backup seluruh data penting tenant dalam format JSON terstruktur, serta memulihkannya kembali secara asinkron menggunakan antrean background worker.

## Aktor & Peran
- **System Superadmin**: Memicu backup global, melihat daftar backup, serta mengunduh berkas cadangan.
- **Admin Sekolah**: Dapat memicu backup data sekolah mereka sendiri dan mengajukan pemulihan data (restore).

## Sub-Modul & Fitur Terimplementasi
### 1. Backup Engine
- **JSON Exporter**: Mengonversi relasi data akademik sekolah menjadi bundel berkas JSON ter-kompresi.
- **GET /admin/backups**: Mengunduh berkas cadangan yang tersimpan di server.

### 2. Asynchronous Restore
- **BullMQ Restore Queue**: Antrean asinkron untuk memproses pemulihan database tanpa membebani thread HTTP server.
- **GET /:id/progress/stream**: Menggunakan SSE (Server-Sent Events) untuk memantau kemajuan proses restorasi data secara real-time.

## Teknologi & Pattern
- **Pattern**: Background Job Processing, Asynchronous Worker, Database Seeder.
- **Teknologi**: BullMQ, Redis, PostgreSQL.
