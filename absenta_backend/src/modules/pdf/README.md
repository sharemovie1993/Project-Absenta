# MODULE PDF GENERATOR SERVICE

## Deskripsi
Modul PDF Generator Service menyediakan engine terpusat untuk merender template HTML menjadi dokumen PDF berkualitas premium dan siap cetak (Sertifikat Siswa, Invoice Tagihan Lisensi Pusat, dan Hasil Supervisi Guru) menggunakan Puppeteer headless.

## Aktor & Peran
- **Sistem Internal / Worker Node**: Mengambil tugas dari antrean dan memproses pembuatan berkas PDF.

## Sub-Modul & Fitur Terimplementasi
### 1. Headless PDF Renderer
- **Puppeteer Worker**: Driver chrome headless yang memuat file HTML lokal dan men-cetaknya ke format PDF.
- **invoice-pdf.queue**: Antrean BullMQ untuk menangani cetak invoice skala besar secara non-blocking.

## Teknologi & Pattern
- **Pattern**: Asynchronous Rendering Service, Queue Worker Pattern.
- **Teknologi**: Puppeteer, BullMQ, Redis.
