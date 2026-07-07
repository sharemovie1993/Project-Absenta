# MODULE AUDIT

## Deskripsi
Modul Audit menyediakan layanan logging kepatuhan (*compliance audit*) yang merekam kejadian keamanan tingkat sistem, kegagalan autentikasi, serta perubahan konfigurasi global sistem untuk keperluan penegakan keamanan.

## Aktor & Peran
- **System Superadmin**: Memantau audit trail sistem secara menyeluruh.

## Sub-Modul & Fitur Terimplementasi
### 1. Security Audit Service
- **System Change Log**: Perekaman perubahan pada file konfigurasi platform, database migration, dan akses impersonasi admin.
- **AuditLogService**: Service internal untuk memicu perekaman log kepatuhan.

## Teknologi & Pattern
- **Pattern**: Singleton Audit Service, Strict System Isolation.
- **Database**: Prisma ORM dengan tabel `AuditLog`.
