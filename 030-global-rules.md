# GLOBAL RULES

Multi-Tenant Isolation:
- **Strict Tenant Filtering**: Setiap query database WAJIB menyertakan filter `tenant_id` (kecuali pada tabel master global atau tabel relasi murni yang tidak memiliki kolom `tenant_id` secara langsung, di mana otorisasi diselesaikan secara transitif/melalui relasi).
- **Enterprise Scoping**: Gunakan utilitas `applyDataScope` untuk membatasi akses data berdasarkan unit organisasi (misal: Wali Kelas hanya melihat data kelasnya).
- **Elevated Creation**: Proses pembuatan data krusial (Kasus BK, Izin Piket) wajib melalui `elevatedScopeMiddleware` untuk memvalidasi wewenang administratif di tingkat unit.
- **Cross-Tenant Guard**: Hanya superadmin sistem yang diperbolehkan mengakses data lintas tenant melalui middleware khusus.

Security & Integrity:
- **JWT-First Authority**: Resolusi identitas tenant WAJIB diprioritaskan dari klaim token JWT daripada header host untuk mencegah spoofing.
- **Capability-Based Access Control (CBAC)**: Otorisasi wajib menggunakan pengecekan capability spesifik (misal: `bk.counseling.view.sensitive`) melalui middleware / preHandler hook `requireCapability(...)`.
- **Audit Trail**: Setiap aksi perubahan data (Create, Update, Delete) wajib mencatat log aktivitas lengkap dengan metadata melalui `activityLogService`.
- **Transactional Consistency**: Operasi finansial dan transisi data (Koperasi, Billing, Year-End Transition) wajib dibungkus dalam `prisma.$transaction`.
- **PIN Security**: Transaksi finansial sensitif di modul Koperasi wajib divalidasi dengan 6-digit PIN yang ter-hashing (Bcrypt).

Database & Data Lifecycle:
- **Soft Delete**: Penggunaan field `deleted_at` untuk entitas utama guna menjaga integritas riwayat. Data yang dihapus hanya dapat dipulihkan melalui fitur Recycle Bin jika memiliki capability khusus.
- **Snapshot Policy**: Data akademik siswa wajib di-snapshot setiap semester ke tabel `SiswaAkademik` untuk menjaga validitas laporan historis.
- **Decimal Precision**: Seluruh data numerik finansial (harga, saldo, SHU) wajib menggunakan tipe data `Decimal` untuk menjamin akurasi perhitungan.

Coding Conventions:
- **Service Layer logic**: Logika bisnis utama dilarang berada di controller; controller hanya bertugas menangani request/response dan pemetaan DTO.
- **Smart Match (Fuzzy Matching)**: Gunakan algoritma `findBestMatch` untuk pemetaan nama entitas (Guru, Mapel, Kelas) pada proses import Excel massal.
- **Anti-Fraud Geofencing**: Absensi lapangan (PKL) wajib memvalidasi radius koordinat GPS (default 100m) dan nilai akurasi perangkat guna mendeteksi penggunaan Fake GPS.
