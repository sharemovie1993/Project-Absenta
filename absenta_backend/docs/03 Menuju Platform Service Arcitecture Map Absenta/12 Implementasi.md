Instruksi Implementasi – Parent App Event Emission Refactor

Payment domain telah berhasil direfactor menjadi event producer.

Langkah berikutnya adalah mengubah komunikasi pada parent-app module agar menggunakan event-driven communication.

---

Konteks:

Saat ini parent-app module masih memiliki dependency langsung ke:

notification module
attendance module

Contoh:

parent-app → notification service (WhatsApp / push / FCM)

Komunikasi ini harus diubah menjadi domain event.

---

Tujuan implementasi:

1. Menjadikan parent-app sebagai event producer.
2. Menghilangkan dependency parent-app terhadap notification module.
3. Menggunakan event bus untuk memicu pengiriman notifikasi.

---

Scope perubahan:

src/modules/parent-app
src/modules/notification

---

Langkah implementasi:

1. Identifikasi seluruh lokasi pada parent-app module yang memanggil notification service.

---

2. Ganti pemanggilan tersebut dengan event emission.

Contoh:

SEBELUM

parent-app memanggil notification service untuk mengirim pesan.

SETELAH

emitDomainEvent("parent.notification.created", payload)

---

3. Payload minimal harus berisi:

tenant_id
parent_id
student_id
message_type
timestamp

---

4. Notification worker harus menjadi consumer untuk event:

parent.notification.created

Notification worker kemudian memproses pengiriman email, WhatsApp, atau push notification.

---

Verifikasi:

Pastikan parent-app module tidak lagi mengimpor notification module.

---

Constraint:

Tidak ada perubahan API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan queue configuration.
