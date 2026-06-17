Instruksi Implementasi – Event Idempotency & Observability

Seluruh domain utama telah direfactor menjadi event-driven.

Langkah berikutnya adalah melakukan hardening pada event processing agar platform aman terhadap duplicate event, retry, dan debugging produksi.

---

Konteks:

Saat ini event processing telah berjalan melalui event bus dan worker.

Namun event-driven system memerlukan mekanisme tambahan untuk:

idempotency
observability
event tracing

agar sistem tetap stabil pada skala besar.

---

Tujuan implementasi:

1. Menambahkan idempotency mechanism pada event consumer.
2. Menambahkan correlation_id untuk tracing event.
3. Menambahkan logging standar pada worker event processing.

---

Scope perubahan:

infra/event-bus
workers/*
notification worker
billing worker
attendance worker

---

Langkah implementasi:

1. Tambahkan field metadata pada setiap event:

correlation_id
idempotency_key

Jika tidak tersedia, generate pada saat emitDomainEvent.

---

2. Worker consumer harus memeriksa idempotency_key sebelum memproses event.

Jika event dengan idempotency_key yang sama sudah diproses, worker harus skip.

---

3. Tambahkan logging standar pada worker:

event_type
tenant_id
correlation_id
worker_name

---

4. Pastikan setiap retry worker mencatat error dengan metadata event.

---

Verifikasi:

Pastikan setiap event yang diproses oleh worker memiliki:

correlation_id
event_type
tenant_id

---

Constraint:

Tidak ada perubahan API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan queue configuration.
