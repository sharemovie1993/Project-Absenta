Laporan Audit — Event Driven Refactor Plan (Absenta Backend)

Ruang lingkup: menyusun roadmap refactor bertahap untuk mengubah komunikasi antar domain dari direct service call menjadi event-driven communication. Tidak ada refactor kode pada tahap ini. Tidak ada perubahan API endpoint, database schema, atau konfigurasi worker pada tahap ini.

---

1) DIRECT CALL REFACTOR MAP

| caller_service | target_service | replacement_event |
|---|---|---|
| attendance | parent-app | attendance.tap |
| attendance | notification | notification.created (turunan dari attendance.tap/attendance.session.*) |
| parent-app | notification | notification.created |
| billing | invoice | billing.invoice.requested |
| invoice | pdf | invoice.pdf.generate_requested |
| invoice | notification/email | notification.email.send_requested |
| payment | billing | payment.succeeded / payment.failed |
| auth (tenant-onboarding) | academic/kesiswaan/invoice/notification/system-config | tenant.onboarding.requested / tenant.onboarding.completed / tenant.onboarding.failed |
| infra/event-bus | attendance/superadmin/notification/parent-app (side-effect) | (dipindahkan menjadi consumer domain/worker) |

---

2) EVENT REPLACEMENT MAP

| current_call | replacement_event |
|---|---|
| attendance -> parentNotificationService.handleEvent | attendance.tap |
| attendance -> getNotificationQueue().add(parent-notification) | notification.created |
| parent-app -> notification services (WA/Push/FCM) | notification.created |
| billing -> InvoiceService.generate/send | billing.invoice.requested |
| invoice -> enqueueInvoicePdfGeneration | invoice.pdf.generate_requested |
| invoice -> getEmailQueue().add(SEND_EMAIL) | notification.email.send_requested |
| payment workflow -> billingService.markAsPaid | payment.succeeded (consumer: billing) |
| auth onboarding worker -> seed + invoice + notif | tenant.onboarding.* |

---

3) EVENT QUEUE IMPLEMENTATION MAP

| event_name | queue | worker |
|---|---|---|
| attendance.tap | parent-notification | notification worker (module) |
| attendance.session.created/closed/status_updated | attendance (atau redis pub/sub untuk realtime) | attendance-worker (jika durable) / realtime relay |
| notification.created | notification (general) | notification-worker |
| notification.email.send_requested | emailQueue | email worker (worker.ts atau notification-worker) |
| billing.invoice.requested | billing | billing-worker (atau invoice worker bila dipisah) |
| invoice.pdf.generate_requested | invoice-pdf | pdf worker (embedded / worker-only) |
| payment.succeeded/failed | billing | billing-worker |
| tenant.onboarding.requested | tenant-onboarding | maintenance-worker (atau worker-only) |
| backup.restore.requested | restore | restore.worker (dipicu via maintenance-worker) |
| analytics.* (risk/metrics/revenue/upgrade) | analytics | analytics-worker |
| infra autoheal-watchdog | infra | infra-worker |
| recurring.* (subscription/invoice overdue/suspend) | recurring | recurring-worker |

---

4) REFACTOR IMPLEMENTATION ORDER

| step_number | domain | description |
|---:|---|---|
| 1 | infra/event-bus | Pisahkan “plumbing” publish/subscribe dari side-effect domain (target: infra tidak import domain modules). |
| 2 | attendance -> notification | Standarkan event attendance.tap dan turunkan ke notification.created + enqueue durable (hindari direct call). |
| 3 | attendance -> parent-app | Alihkan notifikasi orang tua menjadi consumer event (parent-app/notification worker), bukan dipanggil langsung dari attendance. |
| 4 | invoice -> pdf/email | Pastikan invoice menghasilkan event invoice.pdf.generate_requested + notification.email.send_requested (durable). |
| 5 | billing -> invoice | Ganti direct InvoiceService call menjadi billing.invoice.requested (invoice consumer). |
| 6 | payment -> billing | Jadikan payment.succeeded sebagai satu-satunya trigger update billing/subscription (billing consumer), minimalisasi cross-import. |
| 7 | tenant onboarding | Jadikan onboarding sebagai pipeline event/queue (tenant.onboarding.*) sehingga seeding + invoice + notif jadi consumer terpisah. |
| 8 | hardening observability | Tambahkan correlation_id/idempotency_key untuk semua event penting agar tracing dan replay aman. |
| 9 | stabilisasi & cleanup | Hapus jalur direct call yang tersisa setelah event path stabil (bertahap, dengan feature flag bila perlu). |

---

5) REFACTOR RISK ANALYSIS

Risiko utama yang harus dikontrol saat implementasi:
- Duplicate notification (event diproses ganda, terutama pada masa transisi dual-path).
- Event ordering (tap/session update bisa out-of-order di pub/sub).
- Idempotency (markAsPaid, sendInvoice, generatePdf harus idempotent).
- Partial failure (pub/sub realtime gagal tapi queue durable harus tetap jalan).
- Observability gap (tanpa correlation_id sulit tracing lintas worker).
- Backpressure/rate limit (notification/push/WA membutuhkan limiter + retry).
- Coupling terselubung (infra/worker masih mengimpor domain controller/service).

Verifikasi rencana (level roadmap):
- Setiap direct service call pada map memiliki event replacement.
- Setiap event replacement memiliki queue + worker mapping.

