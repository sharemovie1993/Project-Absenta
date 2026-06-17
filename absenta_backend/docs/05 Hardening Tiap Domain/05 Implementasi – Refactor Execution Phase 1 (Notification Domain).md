Instruksi Implementasi – Refactor Execution Phase 1 (Notification Domain)

Gunakan dokumen DOMAIN_REFACTOR_BLUEPRINT.md sebagai referensi utama.

Fokus implementasi phase pertama adalah refactor notification domain.

Tujuan phase ini:

* menghilangkan god consumer pada notification module
* memisahkan event consumer berdasarkan domain
* memastikan consumer tetap domain-aligned
* tidak mengubah perilaku eksternal sistem

LANGKAH IMPLEMENTASI

1. Identifikasi semua event consumer dalam notification module.

Kelompokkan consumer berdasarkan domain event:

attendance events
payment events
parent events
notification request events

2. Pisahkan consumer menjadi handler terpisah:

attendance-event-consumer
payment-event-consumer
parent-notification-consumer
notification-request-consumer

3. Setiap consumer hanya bertanggung jawab pada satu domain event.

Contoh:

attendance-event-consumer
consume:
attendance.tap
attendance.session.tap
attendance.manual.submit

payment-event-consumer
consume:
payment.succeeded
payment.failed
payment.webhook.processed

4. Consumer hanya boleh melakukan:

validasi payload
idempotency check
enqueue job ke queue internal

5. Jangan melakukan query lintas domain dalam consumer.

Jika membutuhkan data tambahan gunakan:

query-by-id repository internal

6. Pastikan semua perubahan tidak merusak:

event bus subscription
queue worker
existing notification behaviour

OUTPUT

Update dokumen berikut:

docs/architecture/DOMAIN_HARDENING_REFACTOR.md

Tambahkan bagian baru:

Notification Domain Refactor – Phase 1

yang menjelaskan perubahan yang dilakukan.
