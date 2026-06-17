Laporan Audit — Event Architecture Specification (Absenta Backend)

Ruang lingkup: spesifikasi event architecture untuk target Modular Monolith + Event Driven + Workers, berdasarkan kondisi sistem saat ini. Tidak ada refactor/perubahan API, schema DB, atau konfigurasi worker.

---

1) EVENT CATALOG

| domain | event_name | description | trigger_location (ringkas) |
|---|---|---|---|
| attendance | attendance.tap | Tap siswa di gerbang (datang/pulang) | attendance/gerbang (controller/service) |
| attendance | attendance.tap.processed | Tap berhasil diproses dan tersimpan | attendance/gerbang (service) |
| attendance | attendance.tap.failed | Tap gagal diproses | attendance/gerbang (service) |
| attendance | attendance.session.created | Sesi absensi dibuat (manual/template/auto) | attendance/sesi-absensi (service) + attendanceAutoSession job |
| attendance | attendance.session.closed | Sesi absensi ditutup otomatis/manual | attendanceAutoClose job + sesi service |
| attendance | attendance.session.status_updated | Status sesi berubah (BERLANGSUNG/SELESAI/dll) | sesi service + autoClose job |
| attendance | attendance.record.updated | Rekam absensi siswa/guru berubah | sesi service |
| attendance | attendance.recap.generated | Rekap dihasilkan/diupdate | attendance/rekap (service) |
| attendance | attendance.digest.requested | Digest absensi dijadwalkan | attendanceDigest job (scheduler) |
| attendance | attendance.digest.sent | Digest berhasil dikirim (email/WA) | attendanceDigest job + notification services |
| billing | billing.subscription.created | Subscription dibuat | billing/subscription (controller/service) |
| billing | billing.subscription.updated | Subscription berubah (upgrade/cancel/renew) | billing/subscription (controller/service) + recurring worker |
| billing | billing.subscription.expired | Subscription berakhir (trial/non-payment) | trialExpiration job + recurring worker |
| billing | billing.invoice.requested | Permintaan generate invoice dari billing | billing + invoice service |
| billing | billing.invoice.generated | Invoice berhasil dibuat | invoice service |
| billing | billing.invoice.sent | Invoice dikirim (email/WA) | invoice service + notification |
| billing | billing.invoice.viewed | Invoice dibuka publik/tercatat | invoice/public routes + invoice service |
| billing | billing.invoice.overdue | Invoice melewati jatuh tempo | recurring worker |
| billing | billing.invoice.suspended | Subscription disuspend karena overdue | recurring worker + billing |
| billing | billing.health_scan.executed | Scan kesehatan billing dijalankan | billingHealthScan job |
| payment | payment.created | Payment dibuat untuk billing | payment + payment-billing integration |
| payment | payment.webhook.received | Webhook payment diterima | payment/webhook controller |
| payment | payment.webhook.verified | Webhook lolos verifikasi | payment/webhook controller + payment workflow |
| payment | payment.webhook.failed | Webhook gagal (signature/status) | payment/webhook controller + audit/observability |
| payment | payment.succeeded | Payment sukses | payment workflow |
| payment | payment.failed | Payment gagal/expired | payment workflow |
| payment | payment.reconciled | Payment pending disinkronkan via reconciliation | paymentReconciliation job |
| parent-app | parent.access_token.created | Token akses orang tua dibuat | parent-app auth/service |
| parent-app | parent.absence_reported | Orang tua melaporkan ketidakhadiran | parent-app (routes/service) |
| parent-app | parent.notification.created | Notifikasi untuk orang tua dibuat | parent-notification service |
| notification | notification.created | Notifikasi (email/WA/push) diminta | producer domain (attendance/billing/payment/parent-app) |
| notification | notification.email.send_requested | Permintaan kirim email | emailQueue producer |
| notification | notification.email.sent | Email terkirim | email worker + notification service |
| notification | notification.email.failed | Email gagal | email worker |
| notification | notification.whatsapp.send_requested | Permintaan kirim WA | notification service |
| notification | notification.push.send_requested | Permintaan push/webpush/FCM | notification service |
| document-center | document.uploaded | Dokumen diunggah | document-center controller/service |
| document-center | document.version.created | Versi dokumen dibuat | document-center service |
| document-center | document.downloaded | Dokumen diunduh | document-center routes |
| document-center | document.deleted | Dokumen dihapus/nonaktif | document-center service |
| document-center | document.mou_pdf.generate_requested | Permintaan generate MOU PDF | mou-pdf queue producer |
| document-center | document.mou_pdf.generated | MOU PDF selesai dibuat | mou-pdf worker |
| backup | backup.snapshot.created | Snapshot backup dibuat | backup module |
| backup | backup.restore.requested | Restore diminta | backup routes/service |
| backup | backup.restore.progress | Progress restore berjalan | restore worker + redis pubsub |
| backup | backup.restore.completed | Restore selesai | restore worker |
| backup | backup.restore.failed | Restore gagal | restore worker |
| tenant | tenant.created | Tenant dibuat | tenant module + auth onboarding |
| tenant | tenant.onboarding.requested | Onboarding dijadwalkan | tenant-onboarding queue producer |
| tenant | tenant.onboarding.completed | Onboarding selesai (seed + notif + invoice awal) | tenant-onboarding worker |
| tenant | tenant.onboarding.failed | Onboarding gagal | tenant-onboarding worker |
| tenant | tenant.retention.enforced | Retention/purge dijalankan | tenantRetention job |
| tenant | tenant.backup.purged | Backup tenant dipurge | tenantBackupPurge job |

---

2) EVENT PRODUCER MAP

| event_name | producer_service | source_file |
|---|---|---|
| attendance.tap | attendance | attendance/gerbang (controller/service) |
| attendance.session.created | attendance | attendance/sesi-absensi (service) + attendanceAutoSession job |
| attendance.session.closed | attendance | attendanceAutoClose job |
| attendance.record.updated | attendance | attendance/sesi-absensi (service) |
| billing.invoice.requested | billing | billing (controller/service) -> invoice service |
| billing.subscription.* | billing | billing/subscription (controller/service) + recurring worker |
| payment.* | payment | payment workflow + webhook controller + reconciliation job |
| parent.notification.created | parent-app | parent-notification service |
| notification.email.send_requested | any | invoice service / payment integration / notification worker |
| document.mou_pdf.generate_requested | document-center | mou-pdf queue producer |
| backup.restore.* | backup | restore queue/worker |
| tenant.onboarding.* | tenant/auth | tenant-onboarding queue/worker |

---

3) EVENT CONSUMER MAP

| event_name | consumer_service | processing_type |
|---|---|---|
| attendance.tap | notification | worker |
| attendance.tap | parent-app | worker |
| attendance.tap | realtime | realtime |
| attendance.session.* | realtime | realtime |
| attendance.record.updated | realtime | realtime |
| billing.invoice.* | notification | worker |
| billing.invoice.requested | invoice | worker |
| payment.succeeded/failed | billing | worker |
| payment.succeeded/failed | notification | worker |
| parent.notification.created | realtime | realtime |
| document.mou_pdf.* | pdf/doc generator | worker |
| backup.restore.progress | api stream (SSE) | realtime |
| tenant.onboarding.* | notification + billing/invoice | worker |

---

4) EVENT QUEUE MAP

| event_name | queue_name | worker_consumer |
|---|---|---|
| attendance.tap | notification (parent-notification) | notification worker (module) |
| attendance.digest.requested | attendance | attendance-worker / notification-worker (kompat) |
| attendance.session.created/closed | attendance | attendance-worker (jika dijadikan async) |
| billing.invoice.requested | billing | billing-worker |
| billing.invoice.generated | notification / invoice-pdf | notification-worker / pdf-worker |
| payment.reconciled | billing | billing-worker |
| payment.succeeded/failed | billing | billing-worker |
| payment.succeeded/failed | notification | notification-worker |
| notification.email.send_requested | emailQueue | email worker (src/worker.ts atau notification-worker) |
| document.mou_pdf.generate_requested | mou-pdf | maintenance-worker / embedded |
| tenant.onboarding.requested | tenant-onboarding | maintenance-worker / embedded / worker-only |
| backup.restore.requested | restore | maintenance-worker + restore worker |
| tenant.retention.enforced | maintenance | maintenance-worker |
| infra autoheal-watchdog | infra | infra-worker |
| analytics aggregation/risk/forecast | analytics | analytics-worker |
| recurring subscription/invoice tasks | recurring | recurring-worker |

---

5) EVENT SCHEMA SPECIFICATION

| field | requirement |
|---|---|
| event_id | wajib, unik, string |
| event_type | wajib, string (contoh: attendance.tap) |
| tenant_id | wajib untuk tenant-scoped event; boleh null hanya untuk event global |
| timestamp | wajib, ISO string |
| source_service | wajib, string |
| payload | wajib, object |
| metadata | opsional, object (correlation_id, actor_user_id, idempotency_key, trace, version) |

---

6) EVENT FLOW DESCRIPTION

Student tap RFID
- attendance menghasilkan attendance.tap
- publish ke redis pub/sub untuk realtime, dan/atau enqueue ke parent-notification queue untuk notifikasi orang tua
- notification/parent-app mengonsumsi untuk pengiriman WA/push dan log

Create attendance session
- attendance menghasilkan attendance.session.created
- publish ke redis pub/sub untuk update dashboard realtime
- bila perlu: enqueue job lanjutan (rekap/digest) ke attendance queue

Payment success
- payment menghasilkan payment.succeeded
- billing mengonsumsi untuk markAsPaid/extend subscription
- invoice/billing menghasilkan billing.invoice.paid (implisit) lalu notification mengonsumsi untuk kirim bukti

Tenant onboarding
- tenant/auth menghasilkan tenant.onboarding.requested (queue)
- maintenance/worker memproses seeding + invoice awal + kirim email/WA
- hasilnya tenant.onboarding.completed atau tenant.onboarding.failed

Invoice generation
- billing menghasilkan billing.invoice.requested
- invoice menghasilkan billing.invoice.generated
- enqueue invoice-pdf.generate_requested (invoice-pdf queue)
- enqueue notification.email.send_requested (emailQueue)

Verifikasi status audit:
- Setiap event memiliki producer, consumer, dan queue mapping pada tabel di atas.

