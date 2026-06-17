Laporan Audit Platform Architecture – Absenta Backend (Mapping Saat Ini)

Ruang lingkup: pemetaan kondisi arsitektur saat ini untuk kesiapan sebagai SaaS Platform Sekolah multi-service. Tidak ada refactor/perubahan kode.

---

1) Audit Struktur Modul Backend

Daftar modul (src/modules):
- academic
- activity
- analytics
- attendance
- audit
- auth
- backup
- billing
- consent
- cooperative
- dashboard
- document-center
- finance
- invoice
- jadwal
- kesiswaan
- kurikulum
- menu
- notification
- observability
- parent-app
- payment
- pdf
- reporting
- revenue
- risk
- sekolah
- superadmin
- system-config
- tenant
- upgrade-intelligence
- upload
- user

Kelompok domain:
- Platform Core: auth, tenant, user, menu, system-config, consent, billing (plan/subscription/billing), invoice, payment
- Service Modules: attendance, cooperative, academic, kesiswaan, kurikulum, parent-app
- Shared Modules: notification, document-center, pdf, upload, reporting, dashboard, audit, activity
- Infrastructure (di luar src/modules): infra/* (router, scheduler, realtime, event-bus, redis, storage, lock, worker services), jobs/*, queues/*, middlewares/*

---

2) Audit Dependency Antar Modul

Relasi dependensi lintas modul (indikasi coupling):
- auth -> system-config, activity
- dashboard -> auth (authorization)
- menu -> auth (authorization)
- attendance -> system-config, notification (queue/services), parent-app
- parent-app -> notification, attendance (rekap)
- notification -> parent-app
- backup -> audit
- billing -> invoice, notification (via jobs), observability, system-config
- jobs/* -> billing, invoice, notification, observability, analytics, risk, upgrade-intelligence, attendance
- infra (realtime/event-bus/middleware) -> attendance (notify controller/feed), superadmin (tenant-detail), notification, parent-app

Catatan coupling yang menonjol (tanpa service abstraction lintas domain):
- billing controller/service langsung memakai InvoiceService dan job billing
- attendance service langsung memakai service/queue notification dan service parent-app
- event-bus/realtime mengimpor controller/service dari module domain (attendance/superadmin) untuk kebutuhan realtime

---

3) Audit Service Capability Integration

Komponen capability platform yang terdeteksi:
- CapabilityGuard: aktif sebagai plugin di protected API (/api) dan membaca route config.capability
- ModuleCapability enum: digunakan sebagai nilai capability per module (route config.capability)
- requireCapability middleware: digunakan luas untuk kontrol akses berbasis permission/capability string

Status integrasi per module yang diminta:
- attendance: SUDAH (ModuleCapability via config.capability + juga memakai requireCapability di banyak route)
- cooperative: SUDAH (ModuleCapability via config.capability; route handler tidak terdeteksi memakai requireCapability)
- reporting: SUDAH (ModuleCapability via config.capability pada seluruh prefix /reports)
- billing: BELUM untuk ModuleCapability via config.capability; SUDAH memakai requireCapability
- document-center: BELUM untuk ModuleCapability via config.capability; SUDAH memakai requireCapability
- notification: BELUM untuk ModuleCapability via config.capability; SUDAH memakai requireCapability

---

4) Audit Route Structure

Route group utama (ringkasan):
- Public/utility: /health, /db-test, /stress/attendance/session
- /api (protectedApi + tenant middleware + capability guard):
  - /api/auth
  - /api/users
  - /api/tenants
  - /api/academic
  - /api/dashboard
  - /api/billing/plans
  - /api/billing/subscriptions
  - /api/billing/my-subscription
  - /api/subscriptions
  - /api/billing/billings
  - /api/billing
  - /api/superadmin/tenants
  - /api/superadmin/infra
  - /api/superadmin/intelligence
  - /api/admin/infra
  - /api/admin/risk
  - /api/admin/revenue
  - /api/admin/analytics
  - /api/admin/analytics/upgrade
  - /api/menu
  - /api/system/config
  - /api/system/observability
  - /api/sekolah
  - /api/consent
  - /api/upload
  - /api/documents
  - /api/pdf
  - /api/invoice
  - /api/payments
  - /api/notifications (juga terdaftar di /api/notification dan /api/v1/notifications)
  - /api/cooperative
  - /api/kesiswaan/pelanggaran
  - /api/kesiswaan/jenis-pelanggaran
  - /api/kurikulum/supervisi
  - /api/attendance
  - /api/reports
- /api/parent-app (tenant middleware khusus, tanpa auth user biasa)
- /api/invoice/public

Route publik di luar /api:
- /invoice/public
- /payment (payment public routes)
- /webhooks/payment
- /documents/public

Kesimpulan: mayoritas service domain sudah memiliki route prefix sendiri; beberapa prefix diduplikasi untuk kompatibilitas (notification).

---

5) Audit Worker / Background Process

Komponen background yang terdeteksi:
- Queue/Worker berbasis BullMQ:
  - email worker (src/worker.ts + src/queue/email.queue.ts)
  - notification worker/queue (src/modules/notification)
  - pdf worker (invoice pdf queue) (src/modules/pdf)
  - mou pdf worker (src/modules/document-center)
  - tenant onboarding worker/queue (src/modules/auth)
  - restore worker/queue (src/modules/backup)
- Scheduler/cron-like jobs (src/infra/scheduler + src/jobs):
  - billing schedulers
  - attendance schedulers
  - alert engine, tenant risk, log retention, metric aggregation, revenue aggregation/forecast, upgrade intelligence, tenant retention, failed job cleanup
  - watchdog (infra queue) via setInterval

Pemisahan eksekusi (ringkasan):
- API thread: scheduler (initSchedulers), realtime, event-bus, dan (opsional) embedded workers jika EMBEDDED_WORKERS=true
- Worker thread: proses worker terpisah (SERVICE_ROLE/WORKER_ROLE) untuk email/recurring/restore dan pdf/onboarding/notification

---

6) Audit Event / Realtime System

Komponen realtime/event yang terdeteksi:
- socket.io (infra/realtime) dengan room berbasis tenant
- Redis pub/sub (infra/event-bus) untuk event:
  - events:sesi_summary_update
  - events:session_attendance_update
  - events:sesi_status_update
  - events:gerbang_tap_update

Pola komunikasi:
- Producer mengirim payload ke Redis channel (pub/sub)
- Subscriber memproses payload dan mem-broadcast ke socket.io room tenant
- Beberapa event memicu notifikasi (web push/parent notification) dari dalam handler event-bus

---

7) Audit Database Domain Separation

Domain grouping (berdasarkan model Prisma):
- Platform Core (tenant/auth/rbac/config): Tenant, User, Role, Permission, RolePermission, StrukturPermission, Config, SystemConfig, Menu, MenuRole, ConsentLog, ActivityLog, AuditLogArchive, SystemEventLog, TenantBackup
- Billing/Subscription/Payment: Plan, PlanFeature, Subscription, SubscriptionHistory, Billing, Invoice, InvoicePublicToken, Payment, RefundRecord, PlanChangeRequest, FinancialReport
- Academic: Jurusan, Kelas, Guru, Mapel, WaliKelas, TahunPelajaran, Semester, Siswa, SiswaAkademik, GuruMapel, KelasMapel, StudentCardConfig, JenisKegiatanMaster, StrukturOrganisasi, GuruStrukturOrganisasi, SiswaStrukturOrganisasi, Sekolah, MasterSekolah
- Attendance: SesiAbsensi, AbsenGuru, AbsenSiswa, SesiGerbang, AbsenGerbangSiswa, SiswaFaceTemplate, JadwalTemplate, AbsensiKejadianKhusus
- Kesiswaan/Kurikulum: JenisPelanggaran, PelanggaranSiswa, SupervisiGuru
- Parent App: OrangTua, OrangTuaSiswa, ParentAccessToken, ParentPushSubscription
- Document Center: Document, DocumentVersion, DocumentActivity
- Notification: NotificationLog, NotificationPreference
- Observability/Analytics/Risk: AggregatedMetricDaily, ObservabilityMetric, QueueJobLog, AlertLog, TenantRiskScore, TenantRiskScoreLog, TenantRiskEvent, revenue_snapshot_monthly, RevenueForecastMonthly, ForecastJobLock, TenantCohortMonthly, TenantUpgradeScoreMonthly, UpgradeFunnelMonthly, UpgradeIntelligenceJobLock
- Cooperative: Member, Saving, SavingTransaction, Loan, Installment, Account, Journal, JournalItem, Product, Sale, SaleItem, Announcement, Voucher, Ticket, TicketMessage, PPOBProduct, PPOBTransaction

---

8) Audit Multi-Tenant Isolation

Ringkasan tenant isolation:
- Umumnya: model operasional inti sudah memakai tenant_id (atau tenantId pada koperasi) dan banyak relasi ke Tenant menggunakan onDelete Cascade
- Model global (tanpa tenant_id): Permission, Plan, PlanFeature, MasterSekolah, Menu, MenuRole (umumnya dianggap platform-global)

Temuan potensial gap/risiko isolation:
- TenantBackup: tenant_id nullable dan relasi ke Tenant onDelete SetNull (bukan Cascade)
- Document: tenant_id nullable (meski relasi ke Tenant memakai Cascade)
- InvoicePublicToken: tenant_id nullable
- Cooperative: sebagian besar tabel turunan tidak punya tenantId langsung (bergantung pada relasi Member/Account), dan Journal tidak memiliki tenantId
- Join table tertentu tidak menyimpan tenant_id (mis. OrangTuaSiswa, ParentPushSubscription), sehingga isolation bergantung pada query scoping via parent entity

---

9) Audit API Coupling

Coupling lintas domain yang terdeteksi (contoh pola):
- Billing memanggil logika Invoice (InvoiceService) dan job billing di layer controller/service
- Attendance memanggil Notification (queue/service) dan Parent App (parent notification/event matrix)
- Parent App memanggil Attendance (rekap) dan Notification
- Realtime/Event-bus mengimpor fungsi/controller/service dari module domain (attendance/superadmin/notification) untuk emit realtime dan side-effect notifikasi
- Auth memanggil System Config dan Activity logging

---

10) Output Audit (Checklist)

Output yang diselesaikan pada laporan ini:
- Daftar module backend
- Dependency lintas modul (coupling map)
- Pemakaian capability system (ModuleCapability/config.capability/CapabilityGuard/requireCapability)
- Route domain mapping (prefix ringkasan)
- Worker/background architecture (queue/worker/scheduler)
- Event/realtime architecture (redis pub/sub + socket.io)
- Database domain grouping
- Multi-tenant isolation check (umum + titik risiko)
- API coupling analysis

