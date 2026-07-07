# TODO BACKUP & RESTORE

## High Priority
- [x] **BullMQ Background Restore**: Memproses file JSON besar melalui background worker.
- [x] **SSE Progress Monitor**: Menyediakan endpoint stream progres restorasi.

## Medium Priority
- [ ] **Cloud Storage Backup Driver**: Mengunggah berkas backup secara otomatis ke AWS S3 bucket.

## Low Priority
- [ ] **Auto Backup Scheduler**: Cron harian untuk backup otomatis data tenant aktif.

## Saran Fitur Baru
- [ ] **Selective Module Restore**: Memungkinkan pengguna hanya memulihkan modul tertentu saja (misal: memulihkan Koperasi tanpa menyentuh data Akademik).
