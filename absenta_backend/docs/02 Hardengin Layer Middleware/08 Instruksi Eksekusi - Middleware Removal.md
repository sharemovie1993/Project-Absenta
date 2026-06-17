Instruksi Eksekusi – Middleware Removal

Pipeline normalization telah selesai dan semua route /api sudah melewati /api plugin pipeline.

Silakan jalankan middleware removal sesuai removal plan yang telah dibuat.

Langkah implementasi:

1. Hapus AuthMiddleware dari:
   /api plugin
   module-level routes

AuthMiddleware harus hanya berada di global level.

2. Hapus TenantMiddleware dari module-level routes dan plugin modules.

TenantMiddleware harus hanya berada di /api plugin pipeline.

3. Hapus CapabilityGuard dari module-level plugins seperti:
   payment
   invoice

CapabilityGuard harus hanya berada di /api plugin pipeline.

4. Jalankan kembali runtime execution audit untuk endpoint:

/api/dashboard
/api/academic/guru
/api/attendance/sesi
/api/cooperative/toko
/api/billing/subscriptions
/api/payments/create

Pastikan setiap endpoint hanya melewati satu instance AuthMiddleware, TenantMiddleware, dan CapabilityGuard.

Tidak boleh ada perubahan pada URL endpoint, request body, atau response structure.
