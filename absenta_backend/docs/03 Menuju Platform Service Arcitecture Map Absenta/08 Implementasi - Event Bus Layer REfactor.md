Instruksi Implementasi – Event Bus Layer Refactor

Event Driven Refactor Plan telah disusun.

Langkah implementasi pertama adalah membersihkan layer infra/event-bus agar hanya berfungsi sebagai plumbing publish/subscribe.

Tujuan tahap ini adalah memisahkan business logic dari event-bus layer.

---

Konteks:

Saat ini infra/event-bus subscriber masih melakukan side-effect lintas domain dan mengimpor domain modules seperti:

attendance
notification
parent-app
superadmin

Hal ini melanggar rule arsitektur platform.

Infra layer tidak boleh mengetahui domain service.

---

Tujuan implementasi:

1. Memastikan infra/event-bus hanya menyediakan mekanisme publish dan subscribe.
2. Menghapus semua dependency dari infra/event-bus ke domain modules.
3. Memindahkan side-effect domain ke worker atau domain consumer.

---

Scope perubahan:

infra/event-bus
infra/realtime subscriber
infra/redis subscriber

---

Langkah implementasi:

1. Audit seluruh file pada folder:

infra/event-bus
infra/realtime
infra/redis-subscriber

Identifikasi import terhadap module domain.

Contoh yang harus dicari:

import attendanceService
import parentNotificationService
import notificationService

---

2. Pisahkan event plumbing dari domain logic.

Event bus hanya boleh memiliki fungsi:

publishRealtime(event)
enqueueEvent(event, queue)
subscribeRealtime(channel, handler)

---

3. Jika subscriber saat ini memanggil domain service, pindahkan logic tersebut ke consumer domain.

Contoh:

SEBELUM

infra subscriber menerima event
→ memanggil notification service

SETELAH

infra subscriber hanya broadcast event
notification worker menjadi consumer event

---

4. Pastikan event-bus layer tidak memiliki dependency ke:

src/modules/*

---

5. Pastikan event-bus layer hanya bergantung pada:

redis
bullmq
logger
config

---

Verifikasi:

Pastikan seluruh file pada infra/event-bus tidak mengimpor module domain.

---

Constraint:

Tidak ada perubahan pada API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan queue configuration.
