# MODULE NOTIFICATION ENGINE

## Deskripsi
Modul Notification Engine adalah pusat distribusi pesan multi-channel (Email, WhatsApp, Push Notification, dan Web-Push) Absenta.id. Modul ini memproses notifikasi penting sistem, pengiriman tagihan, kehadiran harian siswa ke orang tua, serta peringatan BK secara asinkron menggunakan sistem antrean terdistribusi.

## Aktor & Peran
- **Sistem internal**: Pengirim pesan otomatis (cron job, event handler).
- **Semua Pengguna**: Penerima pesan notifikasi dan pengatur preferensi saluran pesan.

## Sub-Modul & Fitur Terimplementasi
### 1. Multi-Channel Sender
- **Services Pool**: Wrapper API untuk pengiriman Firebase Cloud Messaging (FCM), Web-Push, Nodemailer (Email), dan Baileys WhatsApp.
- **BullMQ Workers**: `email.worker` dan `notification.worker` untuk pemrosesan pesan asinkron yang andal.

### 2. Event Consumers
- **Attendance Handler**: Mengirim pesan WA ke orang tua saat siswa melakukan tap RFID.
- **Billing Reminder**: Notifikasi otomatis H-3 jatuh tempo pembayaran lisensi.

## Teknologi & Pattern
- **Pattern**: Event-Driven Architecture, Pub/Sub Consumers, Job Queue.
- **Teknologi**: BullMQ, Redis, Firebase Admin SDK, Nodemailer, @whiskeysockets/baileys.
