# MODULE DOCUMENT CENTER

## Deskripsi
Modul Document Center mengelola penyimpanan pusat berkas digital, pembuatan dokumen MoU otomatis (PDF), penanganan hak akses berkas ter-enkripsi, serta pelacakan riwayat aktivitas perubahan berkas.

## Aktor & Peran
- **Staf Sekolah / Admin**: Pengunggah dokumen kerja, pembuat draf kerjasama industri (MoU).
- **Siswa & Guru**: Pengakses berkas panduan, pengunggah tugas/portofolio.

## Sub-Modul & Fitur Terimplementasi
### 1. Cloud Storage Integration
- **DocumentStorageService**: Layanan pengunggahan berkas umum berbasis driver lokal atau AWS S3-compatible cloud storage.
- **Signed URL Generator**: Pengamanan akses berkas publik dengan masa berlaku singkat (*expired link*).

### 2. MoU Generator
- **Puppeteer MoU Queue**: Pembuatan PDF MoU kemitraan sekolah dengan industri secara asinkron.
- **Document Versioning**: Manajemen riwayat perubahan berkas dengan metadata lengkap.

## Teknologi & Pattern
- **Pattern**: Multi-Driver File Storage, Asynchronous Document Generation.
- **Teknologi**: AWS SDK S3, Puppeteer, BullMQ.
