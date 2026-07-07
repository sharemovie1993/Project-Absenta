# MODULE UPLOAD

## Deskripsi
Modul Upload menyediakan endpoint utilitas terpadu untuk menerima file multimedia (seperti foto profil siswa, bukti surat sakit, lampiran kasus BK, bukti transaksi POS, dan foto kerusakan aset) dan menyimpannya secara aman menggunakan `storageService`.

## Aktor & Peran
- **Semua Pengguna Terotentikasi**: Dapat mengunggah berkas sesuai dengan batasan modul terkait.

## Sub-Modul & Fitur Terimplementasi
### 1. File Upload Gateway
- **POST /**: Menerima multipart file upload, menyaring tipe file, dan mengembalikan URL publik berkas.

## Teknologi & Pattern
- **Pattern**: File Gateway Pattern, Multipart Parsing.
- **Integrasi**: Menyalurkan berkas ke `storageService` lokal atau S3 Cloud.
