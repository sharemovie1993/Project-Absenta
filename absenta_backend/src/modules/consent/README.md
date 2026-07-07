# MODULE CONSENT LOG

## Deskripsi
Modul Consent Log mengelola persetujuan ketentuan layanan, kebijakan privasi, serta kepatuhan hukum (*regulatory compliance*) pengguna terhadap kebijakan data sekolah (terutama untuk pengumpulan foto wajah siswa dan data transaksi koperasi).

## Aktor & Peran
- **Semua Pengguna**: Memberikan persetujuan saat pendaftaran awal (*onboarding*) atau saat ada pembaruan aturan sistem.
- **Admin Sekolah**: Memantau daftar persetujuan kebijakan di lingkungan sekolahnya.

## Sub-Modul & Fitur Terimplementasi
### 1. Consent Tracking
- **POST /log**: Perekaman persetujuan user baru terhadap ketentuan versi tertentu.
- **GET /logs**: Daftar riwayat persetujuan kebijakan oleh siswa/orang tua.

## Teknologi & Pattern
- **Pattern**: Compliance Logging, Audit Trail.
- **Database**: Tabel `ConsentLog` menyimpan data persetujuan dengan stempel waktu dan IP Address.
