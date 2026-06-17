DOMAIN COMPLETION AUDIT — Absenta Backend

Tanggal: 2026-03-15

Ringkasan Platform
- Arsitektur: Event Driven Modular Monolith (Redis Pub/Sub + BullMQ + Workers + Retry/Idempotency/DLQ)
- Lokasi domain modules: src/modules

Ringkasan Angka
- Total modules: 33
- Total controllers (file di folder controllers): 51
- Total routes (file di folder routes): 65
- Total services (file di folder services): 87
- Total guards (file di folder guards): 2
- Total utils (file di folder utils): 1
- Total domain event types (terdeteksi via emitDomainEvent): 13
- Total workers (src/workers): 7
- Total queues (src/queues): 7
- Queue files di module (*.queue.ts di src/modules): 5
- Worker files di module (*.worker.ts di src/modules): 2
- Service files >1000 lines: 8

Module List (Terdeteksi)
academic, activity, analytics, attendance, audit, auth, backup, billing, consent, cooperative, dashboard, document-center, finance, invoice, jadwal, kesiswaan, kurikulum, menu, notification, observability, parent-app, payment, pdf, reporting, revenue, risk, sekolah, superadmin, system-config, tenant, upgrade-intelligence, upload, user

Klasifikasi Domain (Ringkas)
- Core Platform Domains: auth, tenant, user, system-config, menu, audit, activity
- Service Domains: attendance, academic, cooperative, kesiswaan, kurikulum, sekolah, jadwal, parent-app
- Shared Services: notification, document-center, upload, pdf
- Platform Modules: observability, superadmin, backup, analytics, reporting, revenue, risk, finance
- Commercial Domains: billing, invoice, payment

Service Map (Per Module)
Format: module | controllers | routes | services | guards | utils | plugin.ts | index.ts | module-queues | module-workers | large-services(>1000)
- academic | 16 | 16 | 18 | 0 | 0 | NO | NO | 0 | 0 | 1
- activity | 0 | 0 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- analytics | 0 | 2 | 3 | 0 | 0 | NO | NO | 0 | 0 | 0
- attendance | 7 | 8 | 6 | 1 | 0 | YES | NO | 0 | 0 | 2
- audit | 0 | 0 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- auth | 1 | 1 | 2 | 0 | 0 | NO | NO | 1 | 0 | 0
- backup | 1 | 1 | 2 | 0 | 0 | NO | NO | 1 | 1 | 0
- billing | 5 | 6 | 3 | 0 | 0 | NO | NO | 0 | 0 | 2
- consent | 0 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- cooperative | 0 | 0 | 0 | 0 | 0 | YES | NO | 0 | 0 | 0
- dashboard | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- document-center | 1 | 1 | 2 | 0 | 0 | NO | NO | 1 | 0 | 0
- finance | 0 | 0 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- invoice | 1 | 2 | 2 | 0 | 0 | YES | NO | 0 | 0 | 1
- jadwal | 0 | 0 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- kesiswaan | 2 | 2 | 2 | 0 | 0 | NO | NO | 0 | 0 | 0
- kurikulum | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- menu | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- notification | 1 | 1 | 4 | 0 | 0 | NO | YES | 1 | 1 | 0
- observability | 0 | 1 | 4 | 0 | 0 | NO | NO | 0 | 0 | 0
- parent-app | 1 | 1 | 3 | 1 | 0 | NO | NO | 0 | 0 | 0
- payment | 3 | 4 | 14 | 0 | 1 | NO | YES | 0 | 0 | 1
- pdf | 0 | 1 | 1 | 0 | 0 | NO | NO | 1 | 0 | 0
- reporting | 1 | 1 | 1 | 0 | 0 | NO | YES | 0 | 0 | 0
- revenue | 0 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- risk | 0 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- sekolah | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- superadmin | 3 | 4 | 3 | 0 | 0 | NO | YES | 0 | 0 | 1
- system-config | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- tenant | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- upgrade-intelligence | 0 | 2 | 2 | 0 | 0 | NO | NO | 0 | 0 | 0
- upload | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0
- user | 1 | 1 | 1 | 0 | 0 | NO | NO | 0 | 0 | 0

Catatan Boundary (Controller → DB)
- Sejumlah controller masih mengakses prisma langsung (pelanggaran boundary “controller langsung akses database”): terdeteksi pada academic, attendance, auth, backup, billing, dashboard, invoice, kesiswaan, menu, notification, parent-app, payment, superadmin, user.

Event Producer Map (emitDomainEvent)
- attendance:
  - attendance.tap
  - attendance.session.tap
  - attendance.manual.submit
  - notification.email.send_requested
  - notification.whatsapp.send_requested
- billing:
  - billing.invoice.requested
  - SUBSCRIPTION_PLAN_CHANGED
- invoice:
  - billing.invoice.generated
  - notification.email.send_requested
- parent-app:
  - parent.notification.created
- payment:
  - payment.succeeded
  - payment.failed
  - PAYMENT_FAILED
  - PAYMENT_WEBHOOK_PROCESSED

Event Consumer Map (subscribe events:domain)
- invoice:
  - billing.invoice.requested → generate invoice → emit billing.invoice.generated
- billing:
  - payment.succeeded (khusus confirmed_by=TRIPAY_WEBHOOK) → mark billing paid
- notification:
  - attendance.tap / attendance.session.tap / attendance.manual.submit → enqueue parent-notification
  - notification.email.send_requested → enqueue emailQueue
  - notification.whatsapp.send_requested → WA send
  - payment.succeeded / payment.failed → send email/WA + activity log
  - parent.notification.created → dispatch ke WA/PWA/PUSH

Queue & Worker Map
- Workers (src/workers):
  - attendance-worker → queue: attendance (attendance-auto-session, attendance-auto-close, attendance-digest, attendance-stress-session)
  - billing-worker → queue: billing (payment-reconciliation, trial-expiration, recurring-billing, billing-health-scan) + inisialisasi recurring-worker + wiring invoice consumer + wiring invoice-pdf worker
  - recurring-worker → queue: recurring (PROCESS_DUE_SUBSCRIPTION, PROCESS_TRIAL_END, PROCESS_INVOICE_OVERDUE, PROCESS_INVOICE_SUSPENSION)
  - notification-worker → queue: notification (trial-notification, attendance-digest) + queue: email (SEND_EMAIL) + init parent-notification worker + domain subscriber
  - analytics-worker → queue: analytics
  - infra-worker → queue: infra
  - maintenance-worker → queue: maintenance
- Embedded workers/queues di module:
  - auth → tenant-onboarding (queue + worker di module; mengimpor banyak module lain)
  - backup → restore (queue + worker di module)
  - notification → parent-notification queue + worker (di module)
  - pdf → invoice-pdf queue (inisialisasi worker dari billing-worker)
  - document-center → mou-pdf queue

Dependency Graph (Cross-Module)
- Total edges terdeteksi: 42
- Cycles terdeteksi: 3
  - parent-app → attendance → auth → notification → parent-app
  - academic → parent-app → attendance → auth → academic
  - invoice → pdf → invoice

Tenant Isolation Verification (Ringkas)
- TenantMiddleware terpasang sebagai preHandler untuk /api (protected) dan /parent-app.
- Public endpoints ada pada invoice public, payment public, payment webhook, documents public; perlu disiplin validasi akses berbasis token/signature dan tidak mengandalkan tenant context.
- Risiko umum yang masih mungkin: beberapa query menggunakan lookup by id tanpa tenant_id (tergantung endpoint & kontrol akses), sehingga perlu audit lebih dalam per endpoint kritikal pada attendance/academic/billing/payment/reporting.

Domain Completeness Analysis
Status: COMPLETE / PARTIAL / NEEDS REFACTOR

Modules COMPLETE
- activity, audit, consent, dashboard, document-center, finance, jadwal, kesiswaan, kurikulum, menu, observability, reporting, revenue, risk, sekolah, system-config, tenant, upgrade-intelligence, upload, user

Modules PARTIAL
- backup (infra domain; domain boundary cukup jelas, tapi masih perlu alignment pada wiring worker/queue dan kebijakan tenant/retention)
- cooperative (pola plugin/fastify berbeda dari modul lain; perlu standardisasi boundary & observability/capability config)

Modules NEEDS REFACTOR
- academic (service besar; dependency lintas modul; beberapa controller akses DB langsung)
- attendance (service besar; event sudah ada, tapi masih ada domain logic besar dan perlu splitting subdomain/handlers)
- auth (tenant-onboarding worker mengimpor banyak domain lain; coupling tinggi)
- billing (service besar; consumer domain event berada di service file; dependency ke audit/observability/system-config)
- invoice (service besar; consumer domain event berada di service file; cycle dengan pdf)
- notification (consumer domain event menampung terlalu banyak responsibilities; dependency lintas domain)
- parent-app (ikut dalam cycle; masih ada coupling lintas domain)
- payment (service besar; event naming tidak seragam dan ada in-process event emitter terpisah dari domain event)
- superadmin (service besar; scope domain bercampur dan dependency ke observability/audit)

Critical Architecture Risks (Prioritas Tinggi)
- Circular dependency lintas module (3 siklus) yang meningkatkan risiko coupling, deployment friction, dan refactor sulit.
- Service files berukuran besar (>1000 lines) tersebar di domain-domain utama (attendance, billing, invoice, academic, payment, superadmin) yang menandakan boundary belum rapi.
- Event consumers masih berada di service file (invoice.service, billing.service) dan diinisialisasi dari main/worker; pola ini berisiko menghasilkan side-effect lintas domain di proses API.
- Tenant onboarding worker (auth) menjadi “orchestrator” lintas domain yang memanggil banyak service secara langsung (coupling tinggi, sulit diuji, sulit dipisah menjadi event-driven).
- Notification module memproses banyak event lintas domain; perlu pemisahan consumer/handler agar domain-aligned dan mudah diskalakan.

