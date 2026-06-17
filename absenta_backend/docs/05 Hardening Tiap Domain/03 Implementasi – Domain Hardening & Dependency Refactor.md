Instruksi Implementasi – Domain Hardening & Dependency Refactor

Audit tahap kedua telah mengidentifikasi beberapa masalah arsitektur yang menghambat skalabilitas platform.

Masalah utama yang ditemukan:

* circular dependency antar domain
* service files terlalu besar (>1000 lines)
* controller mengakses database langsung
* event architecture tidak konsisten

Tujuan instruksi ini adalah melakukan refactor bertahap tanpa merusak sistem production.

PHASE 1 – PUTUS CIRCULAR DEPENDENCY

Prioritas pertama adalah memutus dependency cycle antar module.

Cycle yang harus diperbaiki:

invoice → pdf → invoice

Solusi:

* invoice module tidak lagi memanggil pdf module secara langsung
* invoice hanya mengemit event:

invoice.pdf.requested

pdf worker akan mengonsumsi event tersebut dan menghasilkan PDF.

PHASE 2 – EVENT ARCHITECTURE STANDARDIZATION

Semua event harus mengikuti format:

domain.event.action

Contoh:

attendance.tap
attendance.session.created
billing.invoice.generated
payment.succeeded
notification.email.send_requested

Hapus event format berikut:

PAYMENT_FAILED
PAYMENT_WEBHOOK_PROCESSED
SUBSCRIPTION_PLAN_CHANGED

Ganti dengan:

payment.failed
payment.webhook.processed
billing.subscription.plan_changed

PHASE 3 – CONTROLLER BOUNDARY FIX

Controller tidak boleh lagi mengakses prisma secara langsung.

Refactor pola berikut:

Controller
→ Service
→ Repository
→ Prisma

Identifikasi semua controller yang menggunakan prisma dan pindahkan query ke service layer.

PHASE 4 – SERVICE DECOMPOSITION

Service dengan ukuran >1000 lines harus dipecah menjadi beberapa layer.

Gunakan struktur berikut:

services/
commands/
queries/
event-handlers/
repositories/

Contoh:

billing.service.ts

dipecah menjadi:

billing.commands.ts
billing.queries.ts
billing.event-handler.ts
billing.repository.ts

PHASE 5 – NOTIFICATION DOMAIN SPLIT

Notification module harus dipisah menjadi consumer yang lebih spesifik.

Pisahkan:

attendance-event-consumer
payment-event-consumer
parent-notification-consumer
notification-request-consumer

Setiap consumer hanya memproses event domain tertentu dan kemudian mengenqueue job ke queue yang sesuai.

PHASE 6 – TENANT ONBOARDING ORCHESTRATOR

Auth tenant-onboarding queue saat ini memanggil banyak service lintas domain.

Refactor menjadi event-driven orchestration:

tenant.created
→ academic.seed
→ notification.welcome
→ billing.subscription.created

OUTPUT

Buat dokumen hasil implementasi:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Dokumen harus menjelaskan:

* dependency yang telah diputus
* service yang telah dipecah
* controller yang telah dibersihkan
* event yang telah distandarisasi
* domain consumer yang telah dipisah
