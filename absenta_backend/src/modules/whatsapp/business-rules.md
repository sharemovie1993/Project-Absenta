# BUSINESS RULES - WHATSAPP DEVICE GATEWAY

### 1. Connection Lifecycle
- **Session Auto-Reconnection**: Sistem secara otomatis mencoba menghubungkan ulang (`auto-reconnect`) koneksi WhatsApp yang terputus hingga maksimal 5 kali percobaan. Jika tetap gagal, status sesi diubah menjadi DISCONNECTED dan admin sekolah akan menerima notifikasi email.
- **Resource Cleanup**: Session file dan auth key Baileys yang terputus/dihapus wajib dibersihkan dari penyimpanan disk/Redis dalam waktu 24 jam untuk menjaga keamanan data autentikasi.
