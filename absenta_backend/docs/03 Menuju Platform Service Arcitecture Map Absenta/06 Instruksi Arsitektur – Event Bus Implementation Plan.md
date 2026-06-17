Instruksi Arsitektur – Event Bus Implementation Plan

Event Architecture Specification telah selesai dibuat.

Langkah berikutnya adalah merancang mekanisme implementasi event bus yang akan digunakan oleh seluruh domain service pada platform Absenta.

Tahap ini tidak melakukan refactor kode bisnis.

Tujuannya adalah mendefinisikan standar implementasi event-driven communication.

---

Tujuan:

1. Menentukan mekanisme event publishing.
2. Menentukan mekanisme event subscription.
3. Menentukan standar event emitter pada domain service.
4. Menentukan standar event consumer pada worker.

---

Scope analisis:

event bus
redis pub/sub
queue system
worker architecture

---

Langkah analisis:

1. Identifikasi mekanisme publish event yang saat ini digunakan.

Cari implementasi:

redis publish
event emitter
queue producer

Laporkan semua mekanisme publish event yang ditemukan.

Output:

EVENT PUBLISHER MAP

event_name
publisher_location
transport

---

2. Identifikasi mekanisme event subscription.

Cari:

redis subscriber
queue worker consumer
in-process event listener

Output:

EVENT SUBSCRIBER MAP

event_name
subscriber_service
transport

---

3. Rancang standar Event Emitter

Buat rancangan standar fungsi emit event untuk domain service.

Contoh target:

emitDomainEvent(event_type, payload)

Output:

EVENT EMITTER STANDARD

function signature
required fields
error handling

---

4. Rancang standar Event Consumer

Buat standar implementasi event consumer untuk worker.

Contoh:

onEvent(event_type, handler)

Output:

EVENT CONSUMER STANDARD

subscription pattern
error handling
retry strategy

---

5. Rancang Event Bus Layer

Buat desain layer event bus yang akan digunakan oleh semua service.

Contoh:

infra/event-bus

Output:

EVENT BUS ARCHITECTURE

publisher interface
subscriber interface
transport layer

---

Verifikasi:

Pastikan desain event bus:

tidak memiliki dependency ke domain modules

---

Constraint:

Tidak ada perubahan pada API endpoint.

Tidak ada perubahan database schema.

Tidak ada refactor kode domain pada tahap ini.
