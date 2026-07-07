# BUSINESS RULES - CORRESPONDENCE

### 1. Penomoran & Keamanan Surat
- **Nomor Surat Uniqueness**: Format nomor surat diatur per tenant melalui konfigurasi kode TU dan wajib bersifat unik.
- **Quick Approval Security**: Token persetujuan kilat (`GET /quick-approve/:token/detail`) bersifat sekali pakai (*single-use*) dan kedaluwarsa dalam 48 jam untuk keamanan persetujuan kepala sekolah via WhatsApp.
- **Immutability of Signed Mail**: Surat keluar yang telah ditandatangani secara digital terkunci dari segala bentuk penyuntingan konten.
