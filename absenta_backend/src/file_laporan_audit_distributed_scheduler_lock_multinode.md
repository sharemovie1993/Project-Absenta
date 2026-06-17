Scheduler Audit Report — Distributed Scheduler Lock (Multi-Node Safety)

Ringkasan Aktivitas Audit (tanpa perubahan kode)
- Mengidentifikasi seluruh scheduler yang diinisialisasi dari API server (initSchedulers) dan job scheduler lain yang berjalan periodik.
- Mengklasifikasikan mekanisme scheduler (interval/cron/enqueue queue).
- Menilai resiko duplicate execution pada multi-node (aman / risk / needs distributed lock).

Catatan Penting tentang Arsitektur Saat Ini
- Sebagian besar “scheduler” di Absenta adalah enqueuer (API process) yang mendorong job ke BullMQ queue (worker process yang mengeksekusi).
- Tidak ditemukan BullMQ repeatable job (repeat:) pada codebase; penjadwalan dilakukan dengan setInterval/setTimeout/node-cron di process API.
- JobRegistry (tryStartJob) adalah lock in-memory per process, bukan distributed.

Daftar Scheduler (yang ditemukan)

| Scheduler Name | Location File | Execution Method | Execution Node | Proteksi Duplicate | Multi-Node Safety |
|---|---|---|---|---|---|
| Billing: Subscription Auto Renew | src/jobs/subscriptionRenewal.job.ts | setInterval (daily) menjalankan logic langsung | API | check existing billing by date (non-atomic) | needs distributed lock |
| Billing: Recurring Billing Enqueuer | src/jobs/recurringBilling.job.ts | setInterval (daily) enqueue billing queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Billing: Payment Reconciliation Enqueuer | src/jobs/paymentReconciliation.job.ts | setInterval (5 menit) enqueue billing queue | API | jobId deterministik per time-bucket | risk (enqueuer multi-node dapat conflict jobId) |
| Billing: Trial Expiration Enqueuer | src/jobs/trialExpiration.job.ts | node-cron (hourly) enqueue billing queue | API | jobId deterministik per jam | risk (cron multi-node dapat conflict jobId) |
| Billing: Trial Notification Enqueuer | src/jobs/trialNotification.job.ts | setInterval (daily) enqueue notification queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Billing: Billing Health Scan Enqueuer | src/jobs/billingHealthScan.job.ts | setInterval (N menit) enqueue billing queue | API | jobId deterministik per time-bucket | risk (enqueuer multi-node dapat conflict jobId) |
| Attendance: Digest Enqueuer | src/jobs/attendanceDigest.job.ts | setInterval (1 menit) enqueue attendance queue | API | jobId deterministik per tenant+tanggal, namun lastRun in-memory | risk (multi-node akan saling enqueue; potensi conflict jobId/error) |
| Attendance: Auto Close Enqueuer | src/jobs/attendanceAutoClose.job.ts | setInterval (1 menit) enqueue attendance queue | API | jobId deterministik per menit + error ditangkap | safe (duplicate enqueue tertahan oleh jobId, error diswallow) |
| Attendance: Auto Session Enqueuer | src/jobs/attendanceAutoSession.job.ts | setInterval (1 menit) enqueue attendance queue | API | jobId deterministik per menit + error ditangkap | safe (duplicate enqueue tertahan oleh jobId, error diswallow) |
| Observability: Alert Engine | src/jobs/alert.job.ts | setInterval (2 menit) menjalankan logic langsung | API | tidak ada distributed lock | needs distributed lock |
| Risk: Tenant Risk Enqueuer | src/jobs/tenantRisk.job.ts | setInterval (daily) enqueue analytics queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Maintenance: Log Retention Enqueuer | src/jobs/logRetention.job.ts | setTimeout + setInterval (daily) enqueue maintenance queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Analytics: Metric Aggregation Enqueuer | src/jobs/metricAggregation.job.ts | setTimeout + setInterval (daily) enqueue analytics queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Analytics: Revenue Aggregation Enqueuer | src/jobs/revenueAggregation.job.ts | setTimeout + setInterval (daily) enqueue analytics queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Analytics: Revenue Forecast Enqueuer | src/jobs/revenueForecast.job.ts | setTimeout + setInterval (daily) enqueue analytics queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Analytics: Revenue Forecast Worker Logic | src/jobs/revenueForecast.job.ts | eksekusi job di queue | worker (analytics) | DB unique lock (forecastJobLock) | safe (execution idempotent by DB lock) |
| Upgrade Intelligence | src/jobs/upgradeIntelligence.job.ts | setTimeout + setInterval (daily) menjalankan logic langsung | API | DB unique lock (upgradeIntelligenceJobLock) | safe (execution idempotent by DB lock) |
| Tenant Retention | src/jobs/tenantRetention.job.ts | setInterval (daily) menjalankan logic langsung | API | tryStartJob (in-memory saja) | needs distributed lock |
| Maintenance: Failed Job Cleanup Enqueuer | src/jobs/failedJobCleanup.job.ts | setInterval (daily) enqueue maintenance queue | API | jobId deterministik per tanggal | risk (enqueuer multi-node dapat conflict jobId) |
| Infra: Autoheal Watchdog Enqueuer | src/infra/scheduler/index.ts | setInterval (10 detik) enqueue infra queue | API | jobId deterministik per 10 detik | risk (enqueuer multi-node dapat conflict jobId) |
| Infra: AutoHeal Scanner | src/infra/autoHealScheduler.ts | setInterval (10 detik) + Redis lock NX/EX | worker (infra) | Redis distributed lock infra:autoheal:lock | safe |
| Infra: Worker Autoscaler | src/infra/worker-autoscaler.service.ts | setInterval (10 detik) | API | tidak ada distributed lock | needs distributed lock |

Catatan Eksekusi Node
- Semua enqueuer di atas berjalan dari API server lewat initSchedulers: src/infra/scheduler/index.ts.
- Worker eksekusi (BullMQ) terjadi di proses worker terpisah: src/workers/*.worker.ts.

Kesimpulan Multi-Node Safety
- Aman (safe):
  - Scheduler yang memakai distributed lock (DB unique lock atau Redis lock).
  - Enqueuer yang memakai jobId deterministik dan error ditangkap (tidak menyebabkan crash) sehingga duplicate enqueue tidak menimbulkan efek samping.
- Risiko (risk):
  - Enqueuer dengan jobId deterministik tetapi dijalankan di multi-node tanpa lock dan tanpa handling conflict secara konsisten; berpotensi memunculkan error/unhandled rejection saat jobId sudah ada.
- Butuh distributed lock (needs distributed lock):
  - Scheduler in-process yang menjalankan logic langsung (alert engine, tenant retention, subscription auto-renew) karena duplicate execution dapat berdampak langsung (mis. membuat invoice/billing ganda, delete tenant ganda, alert spam).
  - Autoscaler yang berjalan di beberapa node berpotensi mengirim perintah scaling bertabrakan.

