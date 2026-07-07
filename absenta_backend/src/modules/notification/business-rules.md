# BUSINESS RULES - NOTIFICATION ENGINE

### 1. Queue & Rate Limiting
- **Idempotency Guard**: Pengiriman notifikasi kehadiran wajib memvalidasi token keunikan (`idempotency_key`) untuk menghindari pengiriman pesan WhatsApp ganda pada tap kartu RFID yang sama.
- **Silence Window**: Notifikasi WhatsApp non-darurat ke orang tua (seperti rekap mingguan) dibatasi hanya terkirim antara jam 07:00 hingga 20:00 WIB untuk menghindari ketidaknyamanan.
- **Opt-Out Control**: Pengguna berhak menonaktifkan salah satu saluran notifikasi melalui pengaturan preferensi, kecuali untuk pesan darurat BK (kasus kriminal, pemanggilan orang tua) dan status keuangan koperasi.
