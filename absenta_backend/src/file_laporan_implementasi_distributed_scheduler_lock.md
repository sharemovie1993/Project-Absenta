Laporan Implementasi — Distributed Scheduler Lock (Multi-Node Safety)

Ringkasan Perubahan
- Menambahkan utilitas distributed lock berbasis Redis (SET NX EX) untuk scheduler multi-node.
- Menerapkan lock pada scheduler in-process yang menjalankan logic langsung di API:
  - Subscription Auto Renew
  - Alert Engine
  - Tenant Retention
  - Worker Autoscaler
- Menambahkan log lock acquired/skipped dan durasi eksekusi pada scheduler terkait.

Lokasi Perubahan
- src/infra/locks/distributedLock.ts
- src/jobs/subscriptionRenewal.job.ts
- src/jobs/alert.job.ts
- src/jobs/tenantRetention.job.ts
- src/infra/worker-autoscaler.service.ts

Build
- npm run build: SUCCESS

