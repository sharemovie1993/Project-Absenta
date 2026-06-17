Instruksi Implementasi – Distributed Scheduler Lock (Multi-Node Safety)

Platform Absenta menggunakan scheduler yang berjalan di API process untuk melakukan enqueue job ke queue atau menjalankan logic periodik.

Audit sebelumnya menunjukkan bahwa sebagian scheduler berjalan menggunakan setInterval / node-cron di API server dan tidak memiliki distributed lock.

Jika platform dijalankan pada lebih dari satu API node, scheduler tersebut dapat berjalan bersamaan di setiap node dan menyebabkan duplicate execution.

Untuk menghindari hal tersebut, diperlukan mekanisme Distributed Scheduler Lock menggunakan Redis.

Tujuan implementasi:

1. Memastikan hanya satu node yang menjalankan scheduler tertentu pada satu waktu.
2. Mencegah duplicate execution pada multi-node deployment.
3. Menyediakan mekanisme distributed lock yang reusable untuk semua scheduler.

Scope perubahan:

infra utilities
scheduler services
subscription renewal job
alert engine job
tenant retention job
worker autoscaler service

Langkah implementasi:

Buat utility baru untuk distributed lock berbasis Redis.

Contoh lokasi file:

src/infra/locks/distributedLock.ts

Utility harus menyediakan fungsi berikut:

acquireLock(lockKey, ttlSeconds)
releaseLock(lockKey)

Implementasi menggunakan Redis command:

SET lockKey value NX EX ttl

Jika SET berhasil, berarti lock diperoleh.

Jika gagal, berarti scheduler sedang dijalankan oleh node lain.

TTL harus digunakan untuk memastikan lock tidak menjadi deadlock jika node mati.

Selanjutnya refactor scheduler berikut agar menggunakan distributed lock sebelum menjalankan logic:

Subscription Auto Renew
file: src/jobs/subscriptionRenewal.job.ts

Alert Engine
file: src/jobs/alert.job.ts

Tenant Retention
file: src/jobs/tenantRetention.job.ts

Worker Autoscaler
file: src/infra/worker-autoscaler.service.ts

Pattern implementasi:

scheduler interval trigger
↓
acquire distributed lock
↓
jika lock gagal → skip execution
↓
jika lock berhasil → jalankan logic scheduler

Contoh alur:

setInterval
→ try acquire lock "scheduler:subscription-renewal"
→ jika gagal return
→ jika berhasil jalankan logic
→ selesai

Pastikan TTL lock sedikit lebih besar dari durasi maksimal eksekusi scheduler.

Contoh TTL:

subscription renewal → 10 menit
alert engine → 2 menit
tenant retention → 10 menit
worker autoscaler → 30 detik

Tambahkan logging untuk observability:

scheduler_lock_acquired
scheduler_lock_skipped
scheduler_execution_started
scheduler_execution_completed

Pastikan lock dilepas secara aman setelah scheduler selesai dijalankan.

Jika node mati sebelum releaseLock dipanggil, TTL akan menghapus lock secara otomatis.

Verifikasi:

Jika dua API server berjalan bersamaan, scheduler hanya dijalankan oleh satu node.

Node lain harus mencatat log scheduler_lock_skipped.

Pastikan worker queue tetap berjalan normal setelah perubahan ini.

Constraint:

Tidak boleh mengubah mekanisme queue worker.

Tidak boleh mengubah struktur database.

Tidak boleh mengubah API endpoint publik.

Distributed lock hanya digunakan untuk scheduler yang menjalankan logic langsung pada API process.
