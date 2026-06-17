DOMAIN HARDENING REFACTOR — Absenta Backend

Tanggal: 2026-03-15

Yang sudah diimplementasikan
- Memutus dependency cycle invoice ↔ pdf dengan mengganti trigger PDF dari pemanggilan langsung menjadi domain event invoice.pdf.requested dan consumer di sisi PDF worker.
- Menambahkan domain consumer untuk invoice.pdf.requested yang meneruskan proses ke invoice-pdf queue/worker.
- Menyesuaikan endpoint download PDF invoice (private & public) agar tidak lagi memanggil module PDF secara langsung untuk generate, dan memakai pola request + retry saat PDF belum tersedia.
- Menstandarisasi event_type yang sebelumnya uppercase menjadi dot-case:
  - PAYMENT_WEBHOOK_PROCESSED → payment.webhook.processed
  - PAYMENT_FAILED → payment.failed
  - SUBSCRIPTION_PLAN_CHANGED → billing.subscription.plan_changed
- Menambahkan backward-compatibility pada query/aggregation tertentu agar tetap membaca log historis (mencakup event_type lama dan baru).

Notification Domain Refactor – Phase 1
- Mengidentifikasi consumer event pada notification worker dan mengelompokkan berdasarkan domain: attendance, payment, parent, notification request.
- Memisahkan consumer menjadi handler terpisah: attendance-event-consumer, payment-event-consumer, parent-notification-consumer, notification-request-consumer.
- Mengubah subscriber agar hanya melakukan validasi ringan, idempotency check, dan enqueue job ke queue internal (tanpa query lintas domain).
- Memindahkan eksekusi side-effect (email/WA/push) dari subscriber ke proses worker berbasis job agar perilaku eksternal tetap sama.

Parent App Refactor – Phase 2
- Menghapus dependency pemanggilan service attendance dari parent-app (report absence dan rekap/tracking tidak lagi mengimpor service attendance).
- Mengubah laporan izin/sakit parent-app menjadi flow berbasis queue job (diproses oleh attendance-worker) untuk menjaga perilaku eksternal tetap sama tanpa service call lintas domain.
- Menambahkan consumer event attendance pada parent-app untuk memproses event attendance yang relevan dan mengupdate cache/view model internal.

Auth Domain Refactor – Phase 3
- Menghapus tenant onboarding orchestrator berbasis queue pada auth dan menggantinya dengan domain event tenant.created saat tenant baru dibuat.
- Memindahkan inisialisasi lintas domain menjadi event consumer per domain:
  - academic: seeding default master data (jenis kegiatan)
  - kesiswaan: seeding default master data (jenis pelanggaran)
  - billing: meminta pembuatan invoice awal via billing.invoice.requested (diproses invoice consumer)
  - notification: mengirim email verifikasi dan WhatsApp welcome berdasarkan payload snapshot tenant.created

Attendance Domain Refactor – Phase 4
- Membuat struktur baru pada attendance domain untuk memisahkan tanggung jawab: commands, queries, repositories, event-handlers.
- Mengurangi ukuran service besar dengan mengekstrak helper/command utama:
  - gerbang.service: memindahkan logic session/transaction/response helper ke file terpisah dan mengganti akses prisma langsung menjadi repository wrapper.
  - sesi.service: memindahkan logic notifikasi guru, notifikasi keterlambatan, dan propagasi status gerbang ke command files terpisah.
- Menjaga API service tetap kompatibel (controller tetap memanggil gerbangService/sesiService seperti sebelumnya).

Academic Domain Refactor – Phase 5
- Memecah src/modules/academic/siswa/services/siswa.service.ts menjadi facade tipis, dan memindahkan implementasi ke command/query handler.
- Menambahkan struktur folder pada domain siswa: commands, queries, repositories, event-handlers.
- Memindahkan akses prisma dari service menjadi repository wrapper (siswaDb) dan memastikan tidak ada file baru melebihi 1000 baris.

Commercial Domain Refactor – Phase 6
- Menambahkan struktur folder pada domain komersial (billing/subscription/payment/invoice): commands, queries, repositories, event-handlers.
- Memindahkan akses prisma dari service langsung menjadi repository wrapper:
  - billingDb / subscriptionDb / paymentDb / invoiceDb
- Memecah logic write besar menjadi command handler:
  - invoice: createInvoice dan generateInvoiceFromBilling dipindah ke commands; consumer billing.invoice.requested dipindah ke event-handlers.
  - payment: processWebhook dipindah ke commands dan service menjadi facade tipis.
  - billing: createBilling dipindah ke commands dan helper invoice number dipindah ke utils.
  - subscription: applyDuePlanChanges dipindah ke commands.
- Menjaga kompatibilitas API: facade service tetap diekspor dengan nama/entrypoint yang sama.

---

Final Architecture Cleanup

Referensi audit: docs/architecture/POST_REFACTOR_AUDIT.md

TARGET 1 — Controller Boundary Cleanup (DONE)
- Menghapus akses prisma langsung dari controller yang teridentifikasi pada audit.
- Pola yang dipakai: controller tetap facade HTTP, seluruh query/mutasi DB dipindah ke service/repository layer.
- Implementasi DB wrapper per module (contoh):
  - authDb, billingDb, notificationDb, notifyDb, jadwalTemplateDb, tenantDetailDb

TARGET 2 — Event Consumer Location (DONE)
- Semua consumer dipindahkan dari consumers/ ke services/event-handlers/ dan wiring diperbarui.

TARGET 3 — Service Size Reduction (DONE)
- billing.service.ts, subscription.service.ts, invoice.service.ts semuanya sudah <1000 lines.

TARGET 4 — Repository Pattern Improvement (PENDING)
- Masih ada pelanggaran pola repository (prisma langsung di service) dan perlu dilanjutkan, prioritas: academic, payment, superadmin, attendance, billing.

---

Architecture Polishing Cleanup

Referensi audit: docs/architecture/POST_REFACTOR_AUDIT.md

TARGET 1 — Service Size Reduction (DONE)
- billing.service.ts, subscription.service.ts, invoice.service.ts sudah <1000 lines dengan pola facade → commands/queries.

TARGET 2 — Event Naming Standardization (DONE)
- notification.email.send_requested → notification.email.send-requested
- notification.whatsapp.send_requested → notification.whatsapp.send-requested
- Consumer menerima event lama dan baru untuk kompatibilitas historis.

TARGET 3 — Repository Pattern Cleanup (IN PROGRESS)
- Domain utama (academic, payment, superadmin, attendance, billing) sudah tidak mengimpor prisma dari utils langsung di layer services/; akses DB mengikuti wrapper repositories/.
