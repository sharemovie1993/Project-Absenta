# BUSINESS RULES - DOCUMENT CENTER

### 1. Storage & Security
- **Strict URL Expiration**: Tautan berkas sensitif (seperti MoU finansial, lembar kasus BK) wajib menggunakan signed URL dengan masa kedaluwarsa maksimal 60 detik.
- **Filename Sanitization**: Nama berkas wajib dibersihkan dari karakter ilegal dan diubah menjadi format UUID/stempel waktu unik untuk mencegah overwrite data.
- **Version Lock**: Berkas MoU yang telah ditandatangani kedua belah pihak masuk ke status READ_ONLY dan versinya tidak dapat diubah kembali.
