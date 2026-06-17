Instruksi Implementasi – Architecture Polishing Cleanup

Referensi audit: docs/architecture/POST_REFACTOR_AUDIT.md

Tujuan fase ini adalah menyelesaikan sisa pelanggaran arsitektur yang teridentifikasi setelah Final Architecture Cleanup.

Fokus pada:

* service size
* event naming
* repository pattern consistency

---

TARGET 1 — Service Size Reduction

Audit menemukan 3 service file masih >1000 lines:

src/modules/billing/services/billing.service.ts
src/modules/billing/services/subscription.service.ts
src/modules/invoice/services/invoice.service.ts

Langkah implementasi:

1. Pecah logic write ke command handlers.

Contoh:

create billing
update billing
cancel billing

renew subscription
change subscription plan

generate invoice
mark invoice paid

2. Pisahkan logic read ke query handlers.

Contoh:

billing history
subscription status
invoice list
invoice detail

3. Service utama tetap menjadi facade yang mendelegasikan ke command/query.

Controller tidak boleh berubah.

---

TARGET 2 — Event Naming Standardization

Audit menemukan event yang belum mengikuti dot-case tanpa underscore:

notification.email.send_requested
notification.whatsapp.send_requested

Standarisasi menjadi:

notification.email.send-requested
notification.whatsapp.send-requested

Langkah implementasi:

1. Perbarui semua pemanggilan emitDomainEvent.

2. Perbarui semua event consumer yang menerima event tersebut.

3. Pastikan backward compatibility untuk log historis tetap terbaca jika diperlukan.

---

TARGET 3 — Repository Pattern Cleanup

Audit menemukan penggunaan prisma langsung di service.

Fokus cleanup hanya pada domain utama:

academic
payment
superadmin
attendance
billing

Langkah implementasi:

1. Jika service menggunakan:

prisma.*

pindahkan query tersebut ke repository file.

2. Repository ditempatkan di:

services/repositories/

3. Service hanya memanggil repository, tidak prisma langsung.

4. Jangan memaksakan repository pada module kecil seperti:

menu
dashboard
analytics
system-config
observability

karena modul tersebut bersifat lightweight.

---

VERIFIKASI SETELAH IMPLEMENTASI

Setelah cleanup selesai jalankan audit ulang.

Target hasil audit:

Circular dependency: 0
Controller boundary violations: 0
Service files >1000 lines: 0
Event naming violations: 0
Repository pattern violations: berkurang signifikan pada domain utama

---

OUTPUT

Perbarui dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Architecture Polishing Cleanup
