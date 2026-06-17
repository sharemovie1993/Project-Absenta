Instruksi Implementasi – Attendance Event Emission Refactor

Event Bus Layer telah berhasil direfactor sehingga menjadi pure infrastructure layer.

Langkah berikutnya adalah mengubah domain attendance agar menggunakan event emission untuk komunikasi lintas domain.

Tujuan tahap ini adalah mengganti direct service call dari attendance ke domain lain dengan domain event.

---

Konteks:

Saat ini domain attendance masih memiliki dependency langsung ke:

parent-app notification service
notification queue

Contoh:

attendance -> parentNotificationService.handleEvent
attendance -> getNotificationQueue().add(parent-notification)

Komunikasi ini harus diubah menjadi event-driven.

---

Tujuan implementasi:

1. Menjadikan attendance sebagai event producer.
2. Menghilangkan dependency attendance terhadap notification dan parent-app.
3. Menggunakan event bus sebagai jalur komunikasi.

---

Scope perubahan:

src/modules/attendance

terutama:

gerbang service
sesi service
manual attendance service

---

Langkah implementasi:

1. Identifikasi semua lokasi dimana attendance memanggil:

parentNotificationService
notification queue

---

2. Ganti pemanggilan tersebut dengan emit event.

Contoh:

SEBELUM

attendance service memanggil parentNotificationService.handleEvent

SETELAH

emitDomainEvent("attendance.tap", payload)

---

3. Payload event minimal harus berisi:

tenant_id
student_id
device_id
tap_time
source_service

---

4. Event emission harus menggunakan event emitter standar platform.

Contoh:

emitDomainEvent(event_type, payload)

---

5. Pastikan attendance module tidak lagi mengimpor:

notification module
parent-app module

---

6. Realtime update tetap menggunakan redis pub/sub melalui event bus.

---

Verifikasi:

Pastikan setelah perubahan:

attendance module tidak memiliki dependency ke notification atau parent-app module.

---

Constraint:

Tidak ada perubahan pada API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan queue configuration.
