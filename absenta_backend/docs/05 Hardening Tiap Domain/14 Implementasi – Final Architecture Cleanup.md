Instruksi Implementasi – Final Architecture Cleanup

Gunakan laporan POST_REFACTOR_AUDIT.md sebagai referensi.

Tujuan fase ini adalah membersihkan sisa pelanggaran arsitektur setelah refactor Phase 1–7.

TARGET 1 — Controller Boundary Cleanup

Perbaiki controller berikut agar tidak mengakses prisma langsung:

attendance/gerbang.controller.ts
attendance/notify.controller.ts
auth.controller.ts
subscription.controller.ts
notification.controller.ts
payment/test.controller.ts
payment/webhook.controller.ts

Semua query prisma harus dipindahkan ke repository layer dan dipanggil melalui service.

TARGET 2 — Event Consumer Location

Pindahkan semua consumer dari folder:

consumers/

ke:

services/event-handlers/

TARGET 3 — Service Size Reduction

Pecah service berikut agar <1000 lines:

billing.service.ts
subscription.service.ts
invoice.service.ts
tenant-detail.service.ts
user.service.ts
sesi.service.ts

TARGET 4 — Repository Pattern Improvement

Kurangi penggunaan prisma langsung di service.

Prioritaskan modul berikut:

academic
payment
superadmin
attendance
billing

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian:

Final Architecture Cleanup
