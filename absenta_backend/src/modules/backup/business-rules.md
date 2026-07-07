# BUSINESS RULES - BACKUP & RESTORE

### 1. Isolation & Security
- **Tenant Bound**: Berkas backup hanya boleh di-restore ke tenant asal (berdasarkan pencocokan `tenant_id` dan NPSN) untuk mencegah tumpang tindih data antar sekolah.
- **Read-Only Lock**: Saat proses restore berlangsung, status operasional tenant wajib dialihkan sementara ke mode pemeliharaan (Maintenance) untuk mencegah anomali perubahan data baru dari user lain.
- **Encryption**: Setiap file backup terenkripsi menggunakan algoritma AES-256 dengan kunci privat platform.
