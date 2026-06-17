DOMAIN REFACTOR BLUEPRINT — Absenta Backend (Domain Hardening)

Tanggal: 2026-03-15
Sumber: docs/architecture/DOMAIN_HARDENING_AUDIT.md

Tujuan
- Menurunkan coupling antar domain agar siap scale SaaS jangka panjang.
- Menghilangkan circular dependency antar module.
- Menstandarisasi event architecture (naming + payload + idempotency + correlation).
- Menegakkan boundary controller → service → repository → prisma.
- Mendekomposisi service besar menjadi unit yang lebih kecil dan teruji.

1. Scope Module yang Akan Direfactor
- Wajib (NEEDS REFACTOR): academic, attendance, auth, billing, invoice, notification, parent-app, payment, superadmin
- Dampak turunan (potensial): pdf, observability, audit, system-config, menu

2. Prinsip Arsitektur yang Harus Diikuti
- Modul adalah boundary: module lain tidak boleh mengimpor service/controller dari module berbeda kecuali melalui kontrak yang disepakati (event, queue job, atau integration adapter yang stabil).
- Event-driven untuk side-effect lintas domain:
  - Domain A tidak memanggil service Domain B secara langsung untuk side-effect.
  - Domain A mengemit event; Domain B mengonsumsi event dan menjalankan side-effect.
- Controller harus tipis:
  - Validasi input, auth/guard, mapping request/response.
  - Tidak ada akses prisma langsung di controller.
- Service dipisah per tanggung jawab:
  - Command (mutasi), Query (read), Event handler (consumer), Repository (DB).
- Tenant isolation sebagai default:
  - Semua query tenant-scoped wajib menambahkan tenant_id.
  - Public endpoints wajib memakai token/signature/ownership check, bukan tenant context.
- Idempotency dan correlation wajib konsisten untuk event dan job:
  - Setiap event lintas domain punya idempotency_key dan correlation_id.
- Observability dan audit sebagai cross-cutting concern:
  - Logging event dan audit harus mengikuti standar event_type yang sama.

3. Target Struktur Module (Pattern Standar)
Struktur target per module (contoh pola umum):
- controllers/
- routes/
- services/
  - commands/
  - queries/
  - event-handlers/
  - repositories/
- types/
- utils/
- index.ts / plugin.ts (sesuai pola fastify yang dipakai)

Konvensi pemisahan:
- commands: hanya write + emit domain event.
- queries: read-only, tidak emit event.
- event-handlers: konsumsi event, validasi idempotency, lalu enqueue job/command internal.
- repositories: satu-satunya tempat akses prisma untuk domain tersebut.

4. Circular Dependency Refactor Plan

4.1 Dependency Graph “Sebelum” (dari audit)
- Cycle A:
  - parent-app → attendance → auth → notification → parent-app
- Cycle B:
  - academic → parent-app → attendance → auth → academic
- Cycle C:
  - invoice → pdf → invoice

4.2 Dependency Graph “Sesudah” (target)
- Hilangkan semua import silang yang membentuk cycle; gantikan dengan event + queue.
- Target dependency (high-level):
  - invoice → (emit event) → pdf (consume event) → (no import back to invoice)
  - attendance → (emit event) → notification (consume event) → parent-app (consume event atau job) tanpa import circular
  - auth tenant onboarding → (emit events) → academic/billing/notification (consume) tanpa memanggil service lintas domain langsung

4.3 Plan Memutus Cycle yang Tersisa
- Cycle A dan B (parent-app/attendance/auth/notification/academic):
  - Ganti call service lintas domain menjadi event:
    - attendance emits:
      - attendance.tap (sudah ada)
      - attendance.manual.submit (sudah ada)
      - attendance.session.tap (sudah ada)
    - notification hanya consume event untuk enqueue notifikasi, bukan memanggil parent-app service.
  - parent-app stop memanggil attendance service langsung:
    - parent-app hanya consume event “parent.*” dan “attendance.*” yang relevan, lalu mengelola view/aggregation internal.
  - auth tenant-onboarding stop menjadi orchestrator langsung:
    - auth emits tenant.created
    - domain lain consume tenant.created untuk menjalankan seeding/initialization masing-masing.

5. Service Decomposition Plan
Target service >1000 lines yang wajib dipecah (berdasarkan audit):
- superadmin/tenant-detail.service
- attendance/gerbang.service
- attendance/sesi.service
- billing/subscription.service
- billing/billing.service
- invoice/invoice.service
- academic/siswa.service
- payment/payment.service

Aturan pemecahan minimum:
- Setiap file service besar dipecah menjadi:
  - 1–3 command handler file
  - 1–3 query handler file
  - 1 event-handler file (jika ada consumer)
  - 1 repository file
- Tidak boleh ada file service baru yang >1000 lines.

6. Controller Boundary Cleanup Plan
Tujuan:
- 0 controller yang mengakses prisma langsung pada module scope refactor.

Strategi:
- Identifikasi controller yang memakai prisma.
- Pindahkan query ke repository module masing-masing.
- Controller memanggil query/command via service layer.
- Endpoint yang tergolong “public” harus memakai guard/verification yang eksplisit (token/signature/ownership).

7. Event Architecture Standard
7.1 Naming Standard
- Format wajib: domain.event.action (lowercase dot-case)
- Contoh:
  - payment.succeeded
  - payment.failed
  - payment.webhook.processed
  - billing.subscription.plan_changed
  - invoice.pdf.requested
  - notification.email.send_requested

7.2 Payload & Metadata Standard (wajib konsisten)
- Key menggunakan snake_case untuk event payload dan metadata.
- Field wajib:
  - event_type
  - event_id
  - tenant_id
  - source_service
  - metadata: correlation_id, idempotency_key
  - payload: domain-specific fields minimal (mis. invoice_id)

7.3 Versioning Policy
- Tambahkan field version (mis. payload.version) atau suffix event_type (mis. *.v1) untuk event yang berpotensi berubah.
- Perubahan breaking wajib menaikkan version dan menjaga consumer lama untuk masa transisi.

8. Notification Domain Split Plan
Tujuan:
- Mengurangi “god consumer” pada notification, dan membuat consumer domain-aligned.

Target pemisahan consumer:
- attendance-event-consumer:
  - Consume attendance.* → enqueue parent-notification jobs
- payment-event-consumer:
  - Consume payment.* → enqueue email/WA jobs
- parent-notification-consumer:
  - Consume parent.notification.created → dispatch ke channel (WA/PWA/PUSH) via queue
- notification-request-consumer:
  - Consume notification.email.send_requested / notification.whatsapp.send_requested → fan-out ke queue transport

Aturan:
- Consumer tidak melakukan query lintas domain secara langsung untuk mengambil data besar; bila perlu, gunakan snapshot payload atau pattern “query-by-id” via repository internal yang tenant-scoped.

9. Urutan Implementasi Refactor (Recommended)
- Step 1: Finalisasi event standard (mapping event lama → baru, dan strategi kompatibilitas log historis).
- Step 2: Putus seluruh import silang yang membentuk cycle A dan B:
  - parent-app ↔ attendance ↔ auth ↔ notification ↔ academic
- Step 3: Pecah notification menjadi consumer spesifik (tanpa mengubah perilaku eksternal).
- Step 4: Controller boundary cleanup untuk module prioritas tinggi:
  - payment, billing, invoice, attendance
- Step 5: Service decomposition bertahap:
  - payment → billing → invoice → attendance → academic → superadmin
- Step 6: Tenant-onboarding orchestrator refactor:
  - tenant.created sebagai trigger tunggal; seeding per domain via event consumer + job
- Step 7: Konsolidasi dependency graph final dan cleanup import lintas module.

10. Definition of Done (DoD)
- Tidak ada circular dependency antar src/modules (cycle count = 0).
- Tidak ada controller dalam scope yang mengakses prisma langsung.
- Event lintas domain memakai dot-case dan standar payload/metadata (snake_case + correlation_id + idempotency_key).
- Notification consumer terpisah sesuai rencana, dan setiap consumer domain-aligned.
- Service besar yang terdeteksi >1000 lines sudah dipecah sesuai struktur target.
- Public endpoints yang terkait invoice/payment memiliki verifikasi akses yang eksplisit.
- Build backend dijalankan dan bersih.
- Dokumen implementasi (DOMAIN_HARDENING_REFACTOR.md) diperbarui untuk mencatat perubahan besar per fase.

Dependency Graph & Event Flow (Ringkas)
- Sebelum:
  - Ada 3 cycle: (parent-app/attendance/auth/notification), (academic/parent-app/attendance/auth), (invoice/pdf)
- Sesudah (target):
  - Tidak ada cycle.
  - Event flow utama:
    - invoice emits invoice.pdf.requested → pdf consumes → generate/store → invoice download endpoint membaca storage_key dan melayani file
    - auth emits tenant.created → academic/billing/notification consumes → masing-masing domain melakukan initialization via job/command internal

