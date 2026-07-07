# BUSINESS RULES - SYSTEM CONFIG

### 1. Configuration Reload
- **Cache Refresh**: Pembaruan konfigurasi global sistem via POST/PUT wajib memicu reload variabel lingkungan (*runtime environment reload*) tanpa memicu crash thread server.
- **Restart Security Check**: Eksekusi restart sistem backend (`/execute` & `/restart`) dibatasi hanya dapat dipanggil ketika status load server sedang berada di bawah 30% untuk menghindari putusnya koneksi aktif.
