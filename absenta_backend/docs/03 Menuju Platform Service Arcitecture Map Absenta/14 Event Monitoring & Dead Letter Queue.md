Instruksi Implementasi – Event Monitoring & Dead Letter Queue

Event-driven architecture pada platform Absenta telah diimplementasikan dan telah dilengkapi dengan idempotency dan observability.

Langkah berikutnya adalah menambahkan mekanisme monitoring dan dead letter queue untuk memastikan stabilitas sistem pada skala besar.

---

Tujuan implementasi:

1. Menyediakan monitoring untuk event processing.
2. Menyediakan dead letter queue untuk event yang gagal diproses.
3. Menyediakan metric dasar untuk worker queue.

---

Scope perubahan:

workers/*
infra/event-bus
queue configuration

---

Langkah implementasi:

1. Tambahkan metric logging pada worker queue:

event_type
processing_time
retry_count
worker_name

---

2. Tambahkan dead letter queue untuk event yang gagal setelah retry maksimum.

Contoh:

notification_dlq
billing_dlq
attendance_dlq

---

3. Worker harus memindahkan event ke DLQ jika retry melebihi batas.

---

4. Tambahkan endpoint monitoring internal:

/internal/events/metrics

yang menampilkan:

event processed count
failed events
retry count
queue backlog

---

Verifikasi:

Pastikan setiap worker queue memiliki retry policy dan dead letter queue.

---

Constraint:

Tidak ada perubahan API endpoint publik.

Endpoint monitoring hanya boleh berada pada internal route.
