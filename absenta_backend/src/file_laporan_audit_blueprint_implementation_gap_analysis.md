Laporan Audit — Blueprint Implementation Gap Analysis (Absenta Backend)

Ruang lingkup: pemetaan komunikasi antar domain saat ini, mapping ke event-driven target, inventaris queue/worker/event-bus. Tidak ada refactor/perubahan kode bisnis.

---

1) Current Domain Communication Map

| caller_domain | target_domain | method_called (ringkas) | file_location |
|---|---|---|---|
| auth | system-config | systemConfigService.* | [auth.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts) |
| auth | activity | activityLogService.* | [auth.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/controllers/auth.controller.ts) |
| auth | sekolah | SekolahService.* | [auth.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/services/auth.service.ts) |
| auth (tenant-onboarding) | academic | seedDefaultJenisKegiatanForTenant | [tenant-onboarding.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/tenant-onboarding.queue.ts) |
| auth (tenant-onboarding) | kesiswaan | seedDefaultJenisPelanggaranForTenant | [tenant-onboarding.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/tenant-onboarding.queue.ts) |
| auth (tenant-onboarding) | invoice | InvoiceService.generateInvoiceFromBilling + InvoiceService.sendInvoice | [tenant-onboarding.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/tenant-onboarding.queue.ts) |
| auth (tenant-onboarding) | notification | WhatsAppService.* + EmailService.* + buildPublicInvoiceUrl | [tenant-onboarding.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/tenant-onboarding.queue.ts) |
| auth (tenant-onboarding) | system-config | systemConfigService.getActive | [tenant-onboarding.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/tenant-onboarding.queue.ts) |
| attendance (gerbang) | system-config | systemConfigService.* | [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts) |
| attendance (gerbang) | parent-app | parentNotificationService.handleEvent | [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts) |
| attendance (gerbang) | notification | getNotificationQueue().add (parent-notification) | [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts) |
| attendance (sesi-absensi) | system-config | systemConfigService.getActive | [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts) |
| attendance (sesi-absensi) | notification | WhatsAppService.* | [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts) |
| attendance (sesi-absensi) | notification | getNotificationQueue().add (parent-notification) | [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts) |
| attendance (manual) | parent-app | parentNotificationService.handleEvent | [manual.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/manual/services/manual.service.ts) |
| parent-app | attendance | rekapService.* | [parent-data.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/parent-app/services/parent-data.service.ts) |
| parent-app | notification | WhatsAppService / pushService / FcmService | [parent-notification.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/parent-app/services/parent-notification.service.ts) |
| notification (worker) | parent-app | parentNotificationService.handleEvent | [notification.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/notification/notification.worker.ts) |
| backup | audit | auditLogService.* | [backup.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/backup/services/backup.service.ts) |
| backup | audit | auditLogService.* | [restore.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/backup/services/restore.service.ts) |
| dashboard | auth | authorizationService.* | [dashboard.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/dashboard/controllers/dashboard.controller.ts) |
| menu | auth | authorizationService.* | [menu.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/menu.service.ts) |
| billing | invoice | InvoiceService.* | [billing.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/billing.controller.ts) |
| billing | invoice | InvoiceService.* | [subscription.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/controllers/subscription.controller.ts) |
| billing | invoice | InvoiceService.* (dynamic import) | [subscription.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/subscription.service.ts) |
| billing | system-config | systemConfigService.* | [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts) |
| billing | observability | observabilityService.* | [billing.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/billing/services/billing.service.ts) |
| invoice | notification | buildPublicInvoiceUrl + enqueue email queue | [invoice.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/services/invoice.service.ts) |
| invoice | pdf | enqueueInvoicePdfGeneration | [invoice.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/services/invoice.service.ts) |
| invoice | system-config | systemConfigService.getActive | [invoice.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/invoice/services/invoice.service.ts) |
| payment | billing | billingService.* | [payments.workflow.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payments.workflow.ts) |
| payment | audit | auditLogService.* | [payments.workflow.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payments.workflow.ts) |
| payment | observability | observabilityService.* / aggregation | [payments.workflow.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payments.workflow.ts) |
| payment | billing | billingService.* | [payment-billing.integration.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payment-billing.integration.service.ts) |
| payment | notification | WhatsAppService.* + Email queue | [payment-billing.integration.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payment-billing.integration.service.ts) |
| payment | system-config | systemConfigService.* | [payment-billing.integration.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/payment/services/payment-billing.integration.service.ts) |

---

2) Event Transformation Map

| current_call | target_event | producer_domain | consumer_services (target) |
|---|---|---|---|
| attendance (gerbang) -> parentNotificationService.handleEvent | attendance.tap | attendance | notification worker, parent-app worker, realtime broadcaster, analytics worker |
| attendance (gerbang/sesi) -> getNotificationQueue().add(parent-notification) | notification.created | attendance | notification worker (pengiriman), realtime broadcaster |
| parent-app -> notification service (WA/Push/FCM) | notification.created | parent-app | notification worker (pengiriman) |
| parent-app -> attendance rekapService | attendance.recap.materialized | attendance | parent-app (consume read-model/aggregated view), dashboard |
| billing -> InvoiceService.generate/send | billing.invoice.requested | billing | invoice service/worker, notification service (invoice sent), pdf worker (bila perlu) |
| invoice -> enqueueInvoicePdfGeneration | invoice.pdf.generate_requested | invoice | pdf worker |
| invoice -> getEmailQueue().add | notification.email.send_requested | invoice | email worker |
| payment workflow -> billingService.markAsPaid | payment.succeeded | payment | billing service/worker, invoice service (status), notification (paid), analytics |
| auth tenant-onboarding worker -> seed academic/kesiswaan + invoice + notif | tenant.onboarding.completed | auth | academic seeder, kesiswaan seeder, billing/invoice, notification |
| backup -> auditLogService.* | audit.log.created | backup | audit service |

Catatan gap utama vs blueprint:
- Masih ada direct call lintas domain (khususnya auth tenant-onboarding, attendance->parent-app, billing->invoice, payment->billing).
- Shared services (notification/pdf) masih bisa dipanggil langsung oleh domain (bukan hanya via event/job).
- Infra/event-bus saat ini memproses event redis dan melakukan side-effect lintas domain (notifikasi/webpush) di layer infra handler.

---

3) Queue Inventory

| queue_name | producer_module | worker_consumer | job_type (contoh) | file_location |
|---|---|---|---|---|
| attendance | scheduler/jobs + API endpoints | attendance-worker | attendance-auto-session, attendance-auto-close, attendance-digest, attendance-stress-session | [attendance.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/attendance.queue.ts), [attendance.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/attendance.worker.ts) |
| billing | scheduler/jobs | billing-worker | payment-reconciliation, trial-expiration, recurring-billing, billing-health-scan | [billing.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/billing.queue.ts), [billing.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/billing.worker.ts) |
| recurring | billing job (producer) | recurring-worker | PROCESS_DUE_SUBSCRIPTION, PROCESS_TRIAL_END, PROCESS_INVOICE_OVERDUE, PROCESS_INVOICE_SUSPENSION | [recurring.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/recurring.queue.ts), [recurring.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/recurring.worker.ts) |
| notification | scheduler/jobs | notification-worker | trial-notification | [notification.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/notification.queue.ts), [notification.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/notification.worker.ts) |
| parent-notification | attendance/parent-app (producer) | notification worker (module) / embedded | ParentEventType.* | [modules/notification/notification.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/notification/notification.queue.ts), [modules/notification/notification.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/notification/notification.worker.ts) |
| emailQueue | invoice/payment/notification | email worker (src/worker.ts atau notification-worker) | SEND_EMAIL | [email.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queue/email.queue.ts), [worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/worker.ts) |
| invoice-pdf | invoice (producer) | pdf worker (embedded atau separate) | generate | [invoice-pdf.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/pdf/invoice-pdf.queue.ts) |
| mou-pdf | document-center (producer) | maintenance worker / embedded | generate | [mou-pdf.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/document-center/mou-pdf.queue.ts) |
| tenant-onboarding | auth (producer) | maintenance worker / embedded / worker-only mode | onboard | [tenant-onboarding.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/auth/tenant-onboarding.queue.ts) |
| restore | backup (producer) | maintenance worker + restore worker | restore | [restore.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/backup/restore.queue.ts), [restore.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/backup/restore.worker.ts) |
| analytics | scheduler/jobs | analytics-worker | tenant-risk, metric-aggregation, revenue-aggregation, revenue-forecast, upgrade-intelligence | [analytics.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/analytics.queue.ts), [analytics.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/analytics.worker.ts) |
| infra | scheduler (watchdog) | infra-worker | autoheal-watchdog | [infra.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/infra.queue.ts), [infra.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/infra.worker.ts) |
| maintenance | scheduler/jobs | maintenance-worker | log-retention, failed-job-cleanup, diag-cpu-burn | [maintenance.queue.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/queues/maintenance.queue.ts), [maintenance.worker.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/workers/maintenance.worker.ts) |

---

4) Worker Deployment Model

| worker_name | queue | concurrency | deployment_mode |
|---|---|---:|---|
| attendance-worker | attendance | 3 | separate worker process (src/workers) |
| billing-worker | billing | 3 | separate worker process (src/workers) |
| recurring-worker | recurring | 3 | separate worker process (src/workers) + juga bisa dimulai dari billing-worker dan src/worker.ts |
| notification-worker | notification + emailQueue | 5 (notification), 1 (emailQueue) | separate worker process (src/workers) |
| analytics-worker | analytics | 2 | separate worker process (src/workers) |
| infra-worker | infra | 1 | separate worker process (src/workers) |
| maintenance-worker | maintenance | 2 | separate worker process (src/workers) + menginisialisasi restore/mou-pdf/tenant-onboarding workers |
| parent-notification worker (module) | parent-notification | 5 | embedded (main.ts saat EMBEDDED_WORKERS=true) dan/atau dipanggil dari notification-worker |
| invoice-pdf worker | invoice-pdf | 1 (default, env PDF_WORKER_CONCURRENCY) | embedded (main.ts saat EMBEDDED_WORKERS=true) atau worker-only mode (SERVICE_ROLE=pdf-worker) atau dipanggil dari billing-worker |
| mou-pdf worker | mou-pdf | 1 (default, env PDF_WORKER_CONCURRENCY) | embedded (main.ts) atau diinisialisasi maintenance-worker |
| email worker (legacy) | emailQueue | 1 | separate process entrypoint (src/worker.ts) |

---

5) Event Bus Map

| event_name | producer | consumer | transport |
|---|---|---|---|
| events:session_attendance_update | attendance (sesi service) | infra/event-bus subscriber, websocket redis-subscriber | redis pub/sub |
| events:sesi_status_update | attendance (sesi service, auto-close job) | infra/event-bus subscriber | redis pub/sub |
| events:sesi_summary_update | attendance (auto-close job) | infra/event-bus subscriber | redis pub/sub |
| events:gerbang_tap_update | attendance (gerbang controller/service) | infra/event-bus subscriber | redis pub/sub |
| events:parent_notification | parent-app (parent notification service) | websocket redis-subscriber | redis pub/sub |
| restore:progress:{backupId} | backup restore worker/service | SSE stream route | redis pub/sub |
| infra-control | infra-command publisher | infra/control-agent | redis pub/sub |
| worker-control | auto-heal scheduler | worker agent/autoscaler | redis pub/sub |
| payment.status.updated* | payment workflow | in-process listeners (jika ada) | in-memory event emitter |

Output audit yang diselesaikan:
- Current Domain Communication Map
- Event Transformation Map
- Queue Inventory
- Worker Deployment Model
- Event Bus Map

