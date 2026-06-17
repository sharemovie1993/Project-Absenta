Instruksi Tambahan – Middleware Execution Flow Audit

Tahap ini bertujuan memverifikasi pipeline middleware yang benar-benar dieksekusi pada request runtime.

Tidak ada perubahan kode pada tahap ini.

Langkah audit:

1. Pilih beberapa endpoint representatif:

/api/dashboard
/api/academic/guru
/api/attendance/sesi
/api/cooperative/products
/api/billing/subscriptions
/api/payments/create

2. Untuk setiap endpoint, catat middleware yang benar-benar dijalankan secara berurutan.

Contoh format laporan:

Endpoint
/api/attendance/sesi

Pipeline aktual:

1 AuthMiddleware (global)
2 AuthMiddleware (/api group)
3 TenantMiddleware (/api group)
4 CapabilityGuard
5 RequireCapability
6 DataScopeMiddleware

3. Hitung jumlah middleware yang dieksekusi per request.

4. Identifikasi middleware yang dieksekusi lebih dari satu kali.

5. Tandai middleware yang sebenarnya tidak perlu dijalankan dua kali.

6. Buat tabel:

Endpoint
Jumlah Middleware
Duplikasi
Catatan

7. Buat diagram pipeline middleware aktual berdasarkan runtime execution.

Output yang diharapkan:

* tabel pipeline middleware runtime
* daftar middleware yang dieksekusi ganda
* estimasi jumlah middleware per request

Tidak ada refactor pada tahap ini.
