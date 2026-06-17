Instruksi Tahap Berikutnya – Pipeline Normalization

Berdasarkan laporan verifikasi, removal middleware belum dapat dieksekusi karena pipeline request belum konsisten.

Tahap berikutnya adalah normalisasi pipeline.

Langkah yang harus dilakukan:

1. Identifikasi semua route yang menggunakan prefix /api tetapi tidak berada di dalam /api plugin pipeline.

Contoh yang telah ditemukan:

* /api/payments/*
* /api/invoice/*

Buat daftar lengkap route tersebut.

2. Pastikan semua route protected berada di dalam /api plugin pipeline.

Jika sebuah module menggunakan prefix /api tetapi tidak berada dalam /api plugin, pindahkan registrasi route tersebut ke dalam /api plugin.

3. Identifikasi semua whitelist prefix pada AuthMiddleware dan TenantMiddleware.

Contoh:

* /payment/*
* /invoice/public/*
* /uploads/*
* webhook prefix

Laporkan semua prefix tersebut.

4. Identifikasi endpoint yang benar-benar perlu public access.

Endpoint tersebut harus menggunakan:

config.skipAuth

atau

config.public

bukan whitelist prefix.

5. Setelah pipeline dinormalisasi, jalankan kembali runtime middleware execution audit untuk endpoint berikut:

/api/dashboard
/api/academic/guru
/api/attendance/sesi
/api/cooperative/toko
/api/billing/subscriptions
/api/payments/create

6. Verifikasi bahwa semua endpoint tersebut melewati pipeline:

AuthMiddleware
TenantMiddleware
CapabilityGuard (jika ada)
Route guards

Tidak ada perubahan kode selain normalisasi pipeline pada tahap ini.
