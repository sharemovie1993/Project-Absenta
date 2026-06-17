Instruksi Audit – Distributed Scheduler Lock (Multi-Node Safety)

Platform Absenta saat ini telah mencapai arsitektur Event Driven Modular Monolith dengan worker queue, object storage, dan background processing.

Langkah berikutnya adalah melakukan audit terhadap seluruh scheduler yang ada pada platform untuk memahami kondisi aktual sebelum mengimplementasikan distributed scheduler lock.

Audit ini bertujuan untuk memastikan bahwa scheduler aman dijalankan pada environment multi-node dan tidak menyebabkan duplicate execution.

Tujuan audit:

1. Mengidentifikasi seluruh scheduler yang berjalan di platform.
2. Mengetahui scheduler mana yang berjalan in-process pada API server.
3. Mengetahui scheduler mana yang menggunakan queue (BullMQ repeatable jobs).
4. Mengidentifikasi scheduler yang berpotensi duplicate execution pada multi-node deployment.

Scope audit:

scheduler services
background jobs
cron jobs
bull repeatable jobs
autoscaler scheduler
subscription renewal scheduler
alert engine scheduler
worker-based scheduler

Langkah audit:

Identifikasi seluruh scheduler yang dijalankan oleh sistem.

Cari penggunaan mekanisme berikut:

setInterval
setTimeout
cron scheduler
node-cron
bull repeatable jobs
custom scheduler services

Catat seluruh scheduler yang ditemukan.

Untuk setiap scheduler, kumpulkan informasi berikut:

nama scheduler
lokasi file kode
mekanisme scheduler (cron / interval / queue repeatable job)
node tempat scheduler berjalan (API / worker)

Identifikasi apakah scheduler berjalan sebagai in-process job pada API server.

Jika scheduler berjalan langsung di dalam proses API (misalnya menggunakan setInterval atau cron), tandai sebagai berpotensi duplicate execution pada multi-node deployment.

Identifikasi scheduler yang berjalan melalui BullMQ repeatable jobs.

Scheduler yang dijalankan melalui queue biasanya lebih aman karena job dikelola oleh Redis.

Namun tetap perlu dicatat apakah enqueue job memiliki deduplication (jobId deterministik).

Identifikasi scheduler yang memiliki proteksi berikut:

dedupe jobId
distributed lock
redis lock
idempotency guard

Jika tidak ada proteksi tersebut, tandai scheduler sebagai membutuhkan distributed lock.

Periksa juga apakah autoscaler scheduler berjalan pada lebih dari satu node dan apakah memiliki mekanisme lock.

Output laporan yang diminta:

Scheduler Audit Report

Scheduler Name
Location File
Execution Method (cron / interval / queue repeatable job)
Execution Node (API / worker)
Multi-Node Safety (safe / risk / needs distributed lock)

Tambahkan catatan khusus jika ditemukan scheduler yang:

berjalan in-process pada API
tidak memiliki mekanisme deduplication
berpotensi menjalankan job lebih dari satu kali pada multi-node deployment

Constraint:

Audit ini tidak boleh melakukan perubahan kode.

Audit hanya membaca kode, mengidentifikasi scheduler, dan mengevaluasi risiko duplicate execution pada multi-node environment.
