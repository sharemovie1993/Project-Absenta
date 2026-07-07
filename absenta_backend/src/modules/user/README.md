# MODULE USER MANAGEMENT

## Deskripsi
Modul User Management mengelola akun pengguna sistem, pembagian peran administratif (Roles), pengaturan matriks kapabilitas (*Capabilities Policy*), alur onboarding user baru, serta manajemen reset sandi aman oleh admin.

## Aktor & Peran
- **Admin Sekolah**: Membuat akun guru/staf baru, mengatur peran (Roles) guru di sekolah, mereset password staf.
- **Semua Pengguna**: Mengubah onboarding mandiri, mengganti email pribadi, memperbarui profil dasar.

## Sub-Modul & Fitur Terimplementasi
### 1. User & Role CRUD
- **Onboarding Flow**: Langkah awal penyelesaian profil pengguna baru (setup password awal & profil).
- **Reset Password API**: Penggantian password akun guru/staf secara administratif oleh Admin.

### 2. Policies & Permissions Manager
- **Capability Binder**: Endpoint impor/ekspor kebijakan peran untuk pengaturan hak akses cepat.

## Teknologi & Pattern
- **Pattern**: Role-based Access Control (RBAC), Policy Import/Export Command.
- **Database**: Tabel `User`, `UserRole`, `RoleCapability`.
