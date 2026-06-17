Instruksi Arsitektur – Event Driven Refactor Plan

Event Architecture Specification dan Event Bus Implementation Plan telah selesai dibuat.

Langkah berikutnya adalah menyusun rencana refactor bertahap untuk mengubah komunikasi antar domain dari direct service call menjadi event-driven communication.

Tahap ini belum melakukan refactor kode.

Tujuannya adalah menyusun roadmap implementasi yang aman.

---

Tujuan:

1. Menentukan domain yang akan direfactor terlebih dahulu.
2. Menentukan event yang akan menggantikan direct service calls.
3. Menentukan queue dan worker yang akan digunakan.
4. Menyusun urutan implementasi refactor.

---

Scope analisis:

attendance
notification
parent-app
billing
payment
invoice
infra/event-bus

---

Langkah analisis:

1. Identifikasi Direct Domain Calls

Gunakan hasil audit sebelumnya untuk mengidentifikasi:

attendance → parent-app
attendance → notification
billing → invoice
payment → billing

Output:

DIRECT CALL REFACTOR MAP

caller_service
target_service
replacement_event

---

2. Tentukan Event Replacement

Untuk setiap direct call, tentukan event yang akan digunakan.

Contoh:

attendance → notification

diganti menjadi:

attendance.tap

Output:

EVENT REPLACEMENT MAP

current_call
replacement_event

---

3. Tentukan Queue Mapping

Tentukan queue yang akan digunakan untuk memproses event tersebut.

Contoh:

attendance.tap
→ parent-notification queue
→ analytics queue

Output:

EVENT QUEUE IMPLEMENTATION MAP

event_name
queue
worker

---

4. Susun Refactor Order

Tentukan urutan implementasi refactor.

Urutan harus meminimalkan risiko perubahan.

Output:

REFACTOR IMPLEMENTATION ORDER

step_number
domain
description

---

5. Identifikasi Risk

Untuk setiap refactor step, identifikasi risiko.

Contoh:

duplicate notification
event ordering
idempotency

Output:

REFACTOR RISK ANALYSIS

---

Verifikasi:

Pastikan setiap direct service call memiliki event replacement.

---

Constraint:

Tidak ada perubahan pada API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan konfigurasi worker pada tahap ini.
