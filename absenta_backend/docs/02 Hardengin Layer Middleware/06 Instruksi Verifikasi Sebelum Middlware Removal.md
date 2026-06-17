Instruksi Verifikasi Sebelum Middleware Removal

Sebelum menjalankan removal middleware, lakukan verifikasi berikut:

1. Pastikan AuthMiddleware global benar-benar berjalan untuk semua route termasuk:

/api/*
/api/payments/*
/api/invoice/*
/api/notifications/*

2. Pastikan semua route protected memiliki prefix /api sehingga TenantMiddleware pada /api plugin tetap berjalan.

3. Verifikasi bahwa endpoint public menggunakan:

config.skipAuth

bukan whitelist prefix.

4. Jalankan test request sederhana untuk endpoint berikut:

/api/dashboard
/api/academic/guru
/api/attendance/sesi
/api/billing/subscriptions
/api/payments/create

dan pastikan pipeline middleware masih sama sebelum removal dilakukan.

Jika semua verifikasi lolos, maka removal plan dapat dieksekusi.
