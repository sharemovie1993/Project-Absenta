Instruksi Implementasi – Payment Event Emission Refactor

Billing domain telah berhasil direfactor menjadi event producer untuk invoice generation.

Langkah berikutnya adalah mengubah komunikasi antara payment dengan billing dan notification menjadi event-driven communication.

---

Konteks:

Saat ini payment module masih memiliki dependency langsung ke:

billing service
notification/email/WhatsApp service

Contoh:

payment workflow -> billingService.markAsPaid
payment integration -> notification service

Komunikasi ini harus diubah menjadi domain event.

---

Tujuan implementasi:

1. Menjadikan payment sebagai event producer.
2. Menghilangkan dependency payment terhadap billing module.
3. Menghilangkan dependency payment terhadap notification module.
4. Menggunakan event bus sebagai jalur komunikasi.

---

Scope perubahan:

src/modules/payment
src/modules/billing
src/modules/notification

---

Langkah implementasi:

1. Identifikasi seluruh lokasi pada payment module yang memanggil:

billingService
notification service

---

2. Ganti pemanggilan tersebut dengan event emission.

Contoh:

SEBELUM

payment workflow memanggil billingService.markAsPaid

SETELAH

emitDomainEvent("payment.succeeded", payload)

---

3. Payload minimal harus berisi:

tenant_id
payment_id
invoice_id
amount
timestamp

---

4. Billing module harus menjadi consumer event:

payment.succeeded

Billing module kemudian melakukan update subscription atau invoice status.

---

5. Notification module harus menjadi consumer event:

payment.succeeded
payment.failed

Notification worker kemudian memproses pengiriman email atau WhatsApp.

---

Verifikasi:

Pastikan payment module tidak lagi mengimpor billing module atau notification module.

---

Constraint:

Tidak ada perubahan API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan queue configuration.
