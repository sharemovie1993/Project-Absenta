Instruksi Implementasi – Refactor Execution Phase 6 (Billing / Payment / Invoice Domain)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Phase ini bertujuan memecah service besar pada domain komersial agar maintainable dan konsisten dengan domain lain.

TARGET FILES

src/modules/billing/services/billing.service.ts
src/modules/billing/services/subscription.service.ts
src/modules/payment/services/payment.service.ts
src/modules/invoice/services/invoice.service.ts

LANGKAH IMPLEMENTASI

1. Buat struktur services baru:

services/
commands/
queries/
repositories/
event-handlers/

2. Pisahkan logic write ke command handlers.

Contoh:

create subscription
renew subscription
generate invoice
confirm payment
handle payment webhook

3. Pisahkan logic read ke query handlers.

Contoh:

subscription status
billing history
invoice list
payment history

4. Pindahkan semua akses prisma ke repository layer.

5. Pastikan event emission tetap dilakukan di command handlers.

6. Controller tetap menggunakan facade service untuk menjaga kompatibilitas API.

7. Pastikan tidak ada file baru yang melebihi 1000 lines.

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Commercial Domain Refactor – Phase 6
