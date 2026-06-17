Instruksi Audit – Event Architecture Specification

Blueprint refactor platform Absenta telah dipahami dan audit arsitektur awal sudah dilakukan.

Sistem saat ini masih memiliki komunikasi domain secara langsung antar service.

Target arsitektur platform adalah:

Modular Monolith + Event Driven + Worker Architecture.

Sebelum refactor dilakukan, perlu dibuat spesifikasi event architecture agar transformasi dapat dilakukan secara sistematis.

Audit ini tidak melakukan refactor kode.

---

Tujuan audit:

1. Mengidentifikasi seluruh event domain yang mungkin terjadi pada setiap service module.
2. Memetakan producer dan consumer untuk setiap event.
3. Menentukan queue yang digunakan untuk memproses event.
4. Menyusun spesifikasi event schema untuk platform Absenta.

---

Scope audit:

Service modules yang harus dianalisis:

attendance
billing
payment
parent-app
notification
document-center
backup
tenant

---

Langkah audit:

1. Identifikasi Domain Event

Untuk setiap service module, buat daftar event domain yang dapat terjadi.

Contoh:

attendance.tap
attendance.session.started
attendance.session.closed

billing.subscription.created
billing.invoice.requested

payment.succeeded
payment.failed

Output:

EVENT CATALOG

domain
event_name
description
trigger_location

---

2. Identifikasi Event Producer

Untuk setiap event, tentukan service yang menghasilkan event tersebut.

Output:

EVENT PRODUCER MAP

event_name
producer_service
source_file

---

3. Identifikasi Event Consumer

Untuk setiap event, tentukan service yang akan mengonsumsi event tersebut.

Contoh:

attendance.tap

consumer:

notification worker
parent-app worker
analytics worker

Output:

EVENT CONSUMER MAP

event_name
consumer_service
processing_type (worker / realtime / scheduler)

---

4. Mapping Event ke Queue

Tentukan queue yang akan digunakan oleh setiap event.

Contoh:

attendance.tap
→ notification_queue
→ analytics_queue

billing.invoice.requested
→ billing_queue
→ notification_queue

Output:

EVENT QUEUE MAP

event_name
queue_name
worker_consumer

---

5. Draft Event Schema

Buat draft struktur event standar untuk platform Absenta.

Minimal field:

event_id
event_type
tenant_id
timestamp
source_service
payload
metadata

Output:

EVENT SCHEMA SPECIFICATION

---

6. Contoh Event Flow

Buat contoh alur event untuk proses utama berikut:

student tap RFID
create attendance session
payment success
tenant onboarding
invoice generation

Output:

EVENT FLOW DESCRIPTION

---

Verifikasi:

Pastikan setiap event memiliki:

event producer
event consumer
queue mapping

---

Constraint:

Tidak ada refactor kode pada tahap ini.

Tidak boleh ada perubahan pada API endpoint, database schema, atau worker configuration.
