# MODULE SYSTEM CONFIGURATION & UPDATE

## Deskripsi
Modul System Config mengelola konfigurasi global tingkat platform, registrasi lisensi global, pemantauan log pembaruan rilis sistem, dan eksekusi restart PM2 backend secara asinkron.

## Aktor & Peran
- **System Superadmin**: Mengubah parameter global sistem (seperti URL License Server, SMTP mail, token WhatsApp gateway, limit storage).

## Sub-Modul & Fitur Terimplementasi
### 1. System Config Manager
- **Active Settings**: Memuat pengaturan sistem ke memori cache saat aplikasi bootstrap.
- **System Update Manager**: Memeriksa ketersediaan versi kode baru di repository Git dan memicu proses `git pull` dan restart server.

## Teknologi & Pattern
- **Pattern**: Global Configuration Repository, Server Remote Updater.
- **Database**: Tabel `SystemConfig`, `SystemUpdateLog`.
