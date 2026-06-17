Platform Infrastructure Audit — Absenta Platform (Worker/Queue/Multi-Node Readiness)

Ringkasan Aktivitas Audit (tanpa perubahan kode)
- Membaca konfigurasi deployment (Docker Compose Windows/Linux, PM2 ecosystem).
- Membaca implementasi BullMQ worker, queue, DLQ, dan service autoscaler/agent.
- Membaca konfigurasi Redis, scheduler, storage, dan event-bus (Redis Pub/Sub).
- Mengidentifikasi komponen yang berdampak pada autoscaling, partitioning queue, dan kesiapan multi-node.

1) Worker Architecture

1.1 Daftar Worker & Concurrency (BullMQ Worker)
- attendance-worker
  - queue: attendance
  - concurrency: 3
- billing-worker
  - queue: billing
  - concurrency: 3
  - catatan: menginisialisasi juga recurring worker + invoice-pdf worker + consumer domain-event (invoice & payment)
- notification-worker
  - queue: notification
  - concurrency: 5
  - juga memproses: emailQueue (default concurrency BullMQ: 1) + parent-notification (worker module)
- analytics-worker
  - queue: analytics
  - concurrency: 2
- maintenance-worker
  - queue: maintenance
  - concurrency: 2
  - catatan: menginisialisasi juga restore worker + tenant-onboarding worker + mou-pdf worker
- infra-worker
  - queue: infra
  - concurrency: 1
- recurring-worker
  - queue: recurring
  - concurrency: 3

1.2 Daftar Worker Modul (BullMQ Worker di dalam module)
- invoice-pdf worker
  - queue: invoice-pdf
  - concurrency: PDF_WORKER_CONCURRENCY (default: 1)
  - dedupe job: jobId berbasis invoiceId
- mou-pdf worker
  - queue: mou-pdf
  - concurrency: PDF_WORKER_CONCURRENCY (default: 1)
- tenant-onboarding worker
  - queue: tenant-onboarding
  - concurrency: 5
- restore worker
  - queue: restore
  - concurrency: 1
  - lockDuration: 10 menit
  - dedupe enqueue: jobId berbasis backupId

1.3 Worker Deployment Model (kondisi saat ini)
- Docker image backend mendukung start API maupun worker (CMD default API; worker dijalankan dengan override command).
- Deployment Docker Compose (contoh: absenta-deploy) menjalankan worker sebagai container terpisah:
  - worker-attendance, worker-billing, worker-notification, worker-analytics, worker-maintenance, worker-infra
  - control-agent/worker-agent dengan akses docker.sock untuk start/stop container worker (autoscale).
- PM2 ecosystem tersedia sebagai alternatif (menjalankan API + worker tertentu).
- Embedded mode tersedia: saat EMBEDDED_WORKERS=true, beberapa worker modul (invoice-pdf/mou-pdf/tenant-onboarding/parent-notification) bisa berjalan di proses API.

1.4 Worker Autoscale Readiness
- Mekanisme autoscale tersedia (queue monitor + publish start/stop + control-agent yang mengelola container via Docker API).
- Autoscaler membaca panjang queue (waiting/delayed/waiting-children), menghitung target, dan menerbitkan control event.
- Kesiapan autoscale: PARTIAL (tergantung deployment Docker + keberadaan control-agent + template container; bukan autoscale native orchestrator seperti Kubernetes HPA).

1.5 Worker Horizontal Scaling Capability (aman multi-instance)
- BullMQ Worker secara prinsip mendukung multi-instance untuk queue yang sama (work-stealing berbasis Redis).
- Proteksi duplikasi untuk consumer domain-event (Redis Pub/Sub) menggunakan kunci idempotency berbasis Redis SET NX dengan TTL.
- Terdapat deduplication pada beberapa enqueue job penting (jobId deterministik: invoice-pdf, restore, autoheal watchdog, beberapa scheduler enqueue).
- Kesimpulan worker scaling: READY untuk menambah instance pada worker berbasis queue (attendance/billing/notification/analytics/maintenance/infra/recurring), dengan catatan komponen non-queue (scheduler tertentu) tetap perlu diperlakukan khusus pada multi-node.

2) Queue Architecture

2.1 Daftar Queue (BullMQ)
- attendance
- attendance_dlq
- billing
- billing_dlq
- notification
- notification_dlq
- emailQueue
- recurring
- analytics
- maintenance
- infra
- parent-notification
- invoice-pdf
- mou-pdf
- tenant-onboarding
- restore

2.2 Queue Partition Strategy (kondisi saat ini)
- Pola utama: “queue per domain/module” (global per environment).
- Tidak ditemukan pola “queue per tenant” atau “partition per tenant” pada level nama queue.
- Segmentasi tenant dilakukan lewat payload/jobId (sebagian), bukan lewat partition queue.

2.3 Queue Volume & Bottleneck (kondisi runtime)
- Data volume (job per jam, waiting/delayed/failed) tidak bisa disimpulkan dari kode saja tanpa akses runtime.
- Tersedia mekanisme monitoring internal yang membaca job counts (waiting/active/failed/delayed) untuk beberapa queue inti (attendance/billing/notification/analytics/maintenance/infra/emailQueue/recurring).
- Kesiapan observability queue: PARTIAL (count tersedia; metrik throughput/latency/CPU/RAM tidak terekam sebagai metrik sistem secara standar dari sisi worker).

3) Infrastructure

3.1 Redis Configuration
- Redis URL berasal dari REDIS_URL (+ optional REDIS_PASSWORD).
- Tidak ada konfigurasi sentinel/cluster pada kode aplikasi.
- Pada contoh docker-compose, Redis berjalan sebagai single instance.

3.2 API Stateless Status
- Auth berbasis token (tidak terindikasi session server-side sebagai state utama).
- Ada fallback cache ke memory jika Redis tidak terkoneksi, sehingga pada kondisi Redis down API menjadi tidak konsisten antar node (stateful-by-fallback).
- Kesimpulan: PARTIAL (stateless jika Redis tersedia dan dipakai; tidak stateless saat fallback memory aktif).

3.3 File Storage
- Backup tenant disimpan ke local disk (baseDir “backups”).
- Dokumen disimpan ke local disk (storage/documents).
- Invoice PDF mendukung local atau S3 (berdasarkan INVOICE_PDF_STORAGE).
- Kesimpulan: PARTIAL/NOT READY untuk multi-node jika mengandalkan local disk tanpa shared storage/object storage.

3.4 Scheduler Safety (multi-node)
- Sebagian scheduler berjalan dengan pola enqueue ke queue dengan jobId deterministik (relatif aman dari duplikasi enqueue lintas node).
- Masih ada scheduler yang berjalan in-process tanpa queue/dedup terdistribusi (contoh: alert engine dan subscription auto-renew) sehingga berpotensi duplicate execution pada multi-node.
- Autoscaler juga diinisialisasi dari scheduler dan dapat berjalan di lebih dari satu node tanpa lock terdistribusi.
- Kesimpulan: PARTIAL (perlu pengamanan tambahan untuk in-process scheduler pada multi-node).

3.5 Event Bus Stability (Redis Pub/Sub)
- Event bus realtime menggunakan Redis Pub/Sub (non-durable).
- Tidak ada mekanisme replay/durable delivery untuk channel pub/sub; risiko event drop jika subscriber offline atau reconnect.
- Subscriber menangani beberapa channel spesifik (attendance updates) dan error diswallow (best-effort).
- Kesimpulan: PARTIAL (cukup untuk realtime/broadcast; bukan untuk event bisnis kritikal).

4) Multi Node Readiness (Kesimpulan)
- Worker Autoscale: PARTIAL (tersedia di Docker-based setup melalui control-agent/autoscaler; belum berbasis orchestrator autoscaling standar).
- Queue High Load Readiness: PARTIAL (queue per domain + concurrency terdefinisi; belum ada partition strategy per tenant; monitoring count ada, namun metrik sistem & strategi shard belum lengkap).
- Infrastructure Multi-Node Readiness: PARTIAL → cenderung NOT READY untuk skenario multi-node penuh karena:
  - Redis tidak HA by default (single instance).
  - Storage default masih local disk (backup/documents, dan PDF bisa local).
  - Ada scheduler in-process yang berpotensi duplicate pada multi-node.

