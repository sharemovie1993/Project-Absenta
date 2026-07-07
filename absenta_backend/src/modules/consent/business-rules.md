# BUSINESS RULES - CONSENT

### 1. Consent Enforcement
- **Mandatory Acceptance**: Pengguna tidak dapat menggunakan fitur-fitur sensitif (seperti pendaftaran e-wallet RFID atau absensi Face Liveness) sebelum mencatatkan log persetujuan kebijakan data privasi.
- **Versioning**: Setiap consent terikat pada versi dokumen hukum (`consent_version`). Jika ada kenaikan versi dokumen, pengguna wajib menyetujui ulang kebijakan tersebut saat login berikutnya.
