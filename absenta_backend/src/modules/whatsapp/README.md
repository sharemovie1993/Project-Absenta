# MODULE WHATSAPP DEVICE GATEWAY

## Deskripsi
Modul WhatsApp Device Gateway mengelola koneksi langsung backend Absenta dengan bot WhatsApp menggunakan library Baileys. Modul ini dioptimalkan dengan pola pool koneksi dinamis per tenant (`multi-tenant WhatsApp session pool`) untuk mengirimkan notifikasi absensi dan BK sekolah secara real-time.

## Aktor & Peran
- **Admin Sekolah**: Melakukan scan QR Code untuk menghubungkan nomor HP sekolah ke sistem, memeriksa status koneksi, dan menguji pengiriman pesan testing.

## Sub-Modul & Fitur Terimplementasi
### 1. Baileys Session Pool
- **Multi-Tenant Gateway**: Pool penampung session Baileys agar server dapat mengelola puluhan koneksi WA sekolah secara paralel dalam satu proses.
- **GET /qr**: Menghasilkan QR Code autentikasi Baileys untuk di-scan WhatsApp web seluler.
- **POST /connect /disconnect**: Kontrol inisiasi session bot WA sekolah.

## Teknologi & Pattern
- **Pattern**: Multi-Tenant Connection Pooling, Adapter Pattern for Baileys.
- **Teknologi**: @whiskeysockets/baileys, Redis session store.
