# MODULE SEKOLAH

## Deskripsi
Modul Sekolah mengelola identitas utama lembaga pendidikan (Tenant), pengaturan jam operasional default, koordinat sekolah, logo resmi, dan integrasi validasi data profil sekolah berbasis database kementerian (NPSN).

## Aktor & Peran
- **Admin Sekolah**: Memperbarui profil lengkap sekolah, koordinat map geofencing, dan logo.
- **System Superadmin**: Melakukan verifikasi legalitas NPSN sekolah baru yang mendaftar.

## Sub-Modul & Fitur Terimplementasi
### 1. School Profile
- **NPSN Lookup**: Integrasi pengecekan kode NPSN untuk memvalidasi keberadaan sekolah.
- **School Configuration**: Pengaturan latitude/longitude sekolah untuk geofencing absensi radius guru.

## Teknologi & Pattern
- **Pattern**: Entity Configuration Pattern.
- **Database**: Tabel `Sekolah` (One-to-One dengan `Tenant`).
