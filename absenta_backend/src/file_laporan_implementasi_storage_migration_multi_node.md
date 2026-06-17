Laporan Implementasi — Storage Migration untuk Multi-Node Deployment

Ringkasan Perubahan
- Menambahkan storage service dengan driver local dan S3 (berbasis STORAGE_DRIVER).
- Memigrasikan Document Storage agar upload/download memakai storage service.
- Memigrasikan Backup Storage agar save/read/delete memakai storage service (tetap kompatibel dengan struktur path existing).
- Memigrasikan Invoice PDF storage agar penyimpanan file memakai storage service (local maupun S3).
- Memperbarui .env.example untuk menambahkan konfigurasi STORAGE_DRIVER dan S3.

Build
- npm run build: SUCCESS

