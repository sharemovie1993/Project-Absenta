DOMAIN HARDENING AUDIT — Absenta Backend

Tanggal: 2026-03-15

Ruang Lingkup
- Fokus module NEEDS REFACTOR: academic, attendance, auth, billing, invoice, notification, parent-app, payment, superadmin
- Fokus audit: circular dependency, service decomposition, event architecture consistency, controller boundary violation, domain coupling

1. Circular Dependency Root Cause

1.1 Siklus: parent-app → attendance → auth → notification → parent-app
- parent-app → attendance (direct service call)
  - src/modules/parent-app/services/parent-data.service.ts
  - src/modules/parent-app/controllers/parent-auth.controller.ts
- attendance → auth (direct service call)
  - src/modules/attendance/notify/controllers/notify.controller.ts
- auth → notification (direct service call)
  - src/modules/auth/controllers/auth.controller.ts
  - src/modules/auth/tenant-onboarding.queue.ts
- notification → parent-app (direct service call)
  - src/modules/notification/notification.worker.ts
  - src/modules/notification/notification.queue.ts
- Observasi: coupling terjadi karena pemanggilan service lintas domain secara langsung (bukan lewat event/job), sehingga perubahan kecil di satu domain berpotensi memaksa perubahan di domain lain.

1.2 Siklus: academic → parent-app → attendance → auth → academic
- academic → parent-app (direct service call)
  - src/modules/academic/siswa/services/siswa.service.ts
- parent-app → attendance (direct service call)
  - src/modules/parent-app/services/parent-data.service.ts
  - src/modules/parent-app/controllers/parent-auth.controller.ts
- attendance → auth (direct service call)
  - src/modules/attendance/notify/controllers/notify.controller.ts
- auth → academic (direct service call)
  - src/modules/auth/tenant-onboarding.queue.ts
- Observasi: auth/tenant-onboarding berperan sebagai orchestrator lintas domain (seeding + notifikasi + invoice), memperkuat siklus dengan domain akademik dan parent-app.

1.3 Siklus: invoice → pdf → invoice
- invoice → pdf (direct service call)
  - src/modules/invoice/controllers/invoice.controller.ts
  - src/modules/invoice/services/invoice.service.ts
  - src/modules/invoice/routes/public.routes.ts
- pdf → invoice (direct service call)
  - src/modules/pdf/routes/pdf.routes.ts
- Observasi: pdf module menggunakan invoiceService untuk mengambil data invoice, sementara invoice module menjalankan PDF generation/enqueue melalui pdf module.

2. Service Decomposition Candidates

Service files > 1000 lines (terdeteksi)
- src/modules/superadmin/tenant-detail/services/tenant-detail.service.ts (1805)
- src/modules/attendance/gerbang/services/gerbang.service.ts (1763)
- src/modules/invoice/services/invoice.service.ts (1761)
- src/modules/academic/siswa/services/siswa.service.ts (1361)
- src/modules/billing/services/subscription.service.ts (1332)
- src/modules/billing/services/billing.service.ts (1298)
- src/modules/attendance/sesi-absensi/services/sesi.service.ts (1201)
- src/modules/payment/services/payment.service.ts (1081)

Kandidat dekomposisi (target pemisahan: command handler / query handler / event handler / repository access)
- superadmin/tenant-detail.service: pisahkan query/reporting tenant detail, command administrasi tenant, dan repository akses prisma.
- attendance/gerbang.service: pisahkan command tap/validasi/side-effect, query monitoring/rekap cepat, handler event realtime vs domain event, dan repository akses.
- attendance/sesi.service: pisahkan command sesi lifecycle, query list/detail, handler notifikasi/event emission, dan repository akses.
- billing/subscription.service + billing/billing.service: pisahkan command subscription lifecycle, query billing/subscription, handler event domain consumer, dan repository akses.
- invoice/invoice.service: pisahkan command invoice generation/sending, query listing/detail, handler domain event consumer, dan repository akses.
- academic/siswa.service: pisahkan command CRUD siswa, query listing/rekap, integrasi parent-app, dan repository akses.
- payment/payment.service: pisahkan command create/confirm/payment workflow, query payment status, handler webhook/observability/audit, dan repository akses.

3. Controller Boundary Violations

Controllers yang menggunakan prisma langsung (module NEEDS REFACTOR)
- academic
  - src/modules/academic/siswa/controllers/siswa.controller.ts (kelas.*, semester.*, siswa.*, tahunPelajaran.*)
  - src/modules/academic/struktur-organisasi/controllers/struktur-organisasi.controller.ts (activityLog.create)
  - src/modules/academic/wali-kelas/controllers/wali-kelas.controller.ts (guru.*, guruStrukturOrganisasi.count)
- attendance
  - src/modules/attendance/gerbang/controllers/gerbang.controller.ts (absenGerbangSiswa.*, sesiGerbang.*, sesiAbsensi.*, siswa.*, siswaFaceTemplate.*, activityLog.create, dll)
  - src/modules/attendance/jadwal-template/controllers/jadwal-template.controller.ts (jadwalTemplate.*, guru.*, semester.*, siswa.*, tahunPelajaran.*, waliKelas.*, dll)
  - src/modules/attendance/notify/controllers/notify.controller.ts (sesiAbsensi.*, absenSiswa.groupBy, notificationLog.create, dll)
  - src/modules/attendance/rekap/controllers/rekap.controller.ts (siswa.findFirst)
- auth
  - src/modules/auth/controllers/auth.controller.ts (tenant.*, user.*, activityLog.*)
- billing
  - src/modules/billing/controllers/billing-dashboard.controller.ts (billing.aggregate/findMany, invoice.aggregate/findMany, payment.count, subscription.count, systemEventLog.count)
  - src/modules/billing/controllers/my-subscription.controller.ts (billing.*, invoice.findMany, payment.findMany, subscription.*, planChangeRequest.*)
  - src/modules/billing/controllers/subscription.controller.ts (subscription.*, billing.*, invoice.*, payment.*, plan.*, planChangeRequest.*, activityLog.create)
- invoice
  - src/modules/invoice/controllers/invoice.controller.ts (invoice.findUnique)
- notification
  - src/modules/notification/controllers/notification.controller.ts (notificationLog.*, systemConfig.findFirst)
- parent-app
  - src/modules/parent-app/controllers/parent-auth.controller.ts (activityLog.create)
- payment
  - src/modules/payment/controllers/test.controller.ts (billing.*, payment.*, subscription.*, systemEventLog.*, tenant.findFirst)
  - src/modules/payment/controllers/webhook.controller.ts (invoice.findFirst, payment.find*, systemEventLog.findFirst)

4. Event Architecture Issues

4.1 Naming consistency
- Ditemukan campuran format event_type:
  - lowercase dot-case: attendance.tap, billing.invoice.requested, payment.succeeded, notification.email.send_requested
  - UPPERCASE underscore: PAYMENT_FAILED, PAYMENT_WEBHOOK_PROCESSED, SUBSCRIPTION_PLAN_CHANGED
- Ditemukan duplikasi konsep event payment gagal:
  - payment.failed vs PAYMENT_FAILED

4.2 Payload schema consistency
- Terindikasi campuran key naming dalam payload/metadata:
  - tenant_id vs tenantId
  - correlation_id vs correlationId
  - idempotency_key vs idempotencyKey
- Sebagian event mengandalkan fallback tenant_id dari payload saat evt.tenant_id kosong (konsumen melakukan normalisasi manual).

4.3 Event versioning
- Tidak ditemukan pola versioning eksplisit pada event_type/payload (mis. suffix v1/v2 atau field version) untuk domain events.

5. Notification Domain Refactor Candidates

Temuan utama
- notification worker melakukan konsumsi banyak event lintas domain pada satu subscriber (events:domain), mencakup attendance, payment, parent-app, dan event internal notification.
- Notification domain saat ini memuat kombinasi:
  - event consumer (redis subscribe)
  - orchestration (enqueue queue internal)
  - side-effect (email/WA/push) + query DB lintas domain (payment/invoice/billing/tenant/user)

Kandidat pemisahan
- Pisahkan consumer per domain atau per responsibility:
  - attendance-event-consumer → hanya mapping attendance.* → enqueue parent-notification
  - payment-event-consumer → hanya payment.* → enqueue email/WA (atau delegate ke payment module)
  - parent-notification-consumer → hanya parent.notification.created → dispatch channels
  - notification-request-consumer → notification.email.send_requested/notification.whatsapp.send_requested → fan-out ke transport durable (queue) / gateway

6. Recommended Refactor Plan

Prioritas 1 (memutus circular dependency)
- Putus siklus invoice ↔ pdf:
  - Jadikan pdf module tidak mengimpor invoiceService (akses data via repository/query internal atau endpoint/integration layer yang stabil).
  - Konsolidasikan trigger PDF di satu arah (invoice → pdf via queue/job atau event).
- Putus siklus parent-app ↔ attendance ↔ auth ↔ notification:
  - Ganti direct service call antar domain dengan domain events + queue jobs untuk side-effect.
  - Kurangi “orchestrator” lintas domain pada auth/tenant-onboarding dengan memindahkan seeding dan notifikasi menjadi job/event terpisah.

Prioritas 2 (service decomposition)
- Pecah service >1000 lines menjadi unit command/query/event/repository untuk menurunkan kompleksitas dan memperjelas boundary.

Prioritas 3 (controller boundary)
- Migrasikan akses prisma langsung di controller ke layer service/repository agar controller hanya melakukan: validation, authorization, mapping request/response.

Prioritas 4 (event standardisasi)
- Standardisasi event_type ke satu gaya penamaan (disarankan lowercase dot-case) dan hilangkan duplikasi event semantik.
- Tetapkan konvensi payload (snake_case atau camelCase) dan dukung correlation/idempotency secara konsisten.
- Tambahkan versioning policy untuk domain events.

