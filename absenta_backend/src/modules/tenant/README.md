# MODULE TENANT

## Deskripsi
Modul Tenant mengelola daur hidup registrasi akun institusi sekolah (*School Tenant Lifecycle*) pada platform Absenta.id. Modul ini bertanggung jawab atas pembentukan database relasional terisolasi sekolah baru, alokasi domain, dan penanganan permohonan penghapusan akun (*Recycle Bin*).

## Aktor & Peran
- **System Superadmin**: Menerima pendaftaran tenant, menyetujui penangguhan (*suspension*), dan menghapus tenant permanen.
- **Admin Sekolah (Tenant Owner)**: Mengubah data dasar tenant, mengajukan penghapusan akun sekolah.

## Sub-Modul & Fitur Terimplementasi
### 1. Tenant Lifecycle Manager
- **Tenant Provisioning**: Pembuatan entitas sekolah baru lengkap dengan skema data relasi kosong default.
- **Request Deletion**: Fitur pengajuan hapus tenant dengan mekanisme masa tenggang recovery.

## Teknologi & Pattern
- **Pattern**: Multi-tenant Provisioning, Logical Tenant Separation.
- **Database**: Tabel `Tenant` (Merupakan entitas master relasi global).
