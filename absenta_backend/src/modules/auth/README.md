# MODULE AUTHENTICATION & AUTHORIZATION

## Deskripsi
Modul Auth mengelola seluruh siklus autentikasi pengguna menggunakan stateless token JWT, verifikasi email transaksional, pemulihan kata sandi, serta otorisasi berbasis kapabilitas (CBAC) dan hierarki struktur organisasi (Organizational Scope).

## Aktor & Peran
- **Semua Pengguna**: Melakukan registrasi, verifikasi email, login, refresh token, logout, dan pembaruan password.
- **System Superadmin**: Memiliki kapabilitas penuh, berhak menggunakan fitur *impersonate* (masuk sebagai user mana pun untuk keperluan debugging).

## Sub-Modul & Fitur Terimplementasi
### 1. Authentication Lifecycle
- **Sign In/Up & Verify**: Registrasi mandiri sekolah, login, refresh token, verifikasi link email, reset password.
- **Impersonate Engine**: Fitur debug superadmin untuk masuk ke tenant tanpa kredensial.
- **Stateless Session (JWT)**: Otorisasi token transaksional dengan public/private key.

### 2. Capability-Based Access Control (CBAC) & Org Scope
- **requireCapability Middleware**: preHandler hook Fastify yang memvalidasi kapabilitas spesifik sebelum akses route diizinkan.
- **Organizational Authorization Engine**: Resolusi hak akses dinamis berdasarkan posisi struktural (Wali Kelas, Kaprog, BK) dan wilayah penugasan (Assignment).
- **Redis Cache Layer**: Penyimpanan context jabatan user untuk mempercepat preHandler authorization.

## Teknologi & Pattern
- **Pattern**: Stateless JWT, CBAC, Cache-Aside Pattern, RBAC/CBAC Hybrid.
- **Database**: Tabel `User`, `Role`, `Capability`, `OrganizationalAssignment`.
