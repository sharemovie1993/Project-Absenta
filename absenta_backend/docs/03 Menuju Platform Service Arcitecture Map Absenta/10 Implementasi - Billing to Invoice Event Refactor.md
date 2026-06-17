Instruksi Implementasi – Billing to Invoice Event Refactor

Attendance domain telah berhasil direfactor menjadi event producer.

Langkah berikutnya adalah mengubah komunikasi antara billing dan invoice dari direct service call menjadi event-driven communication.

---

Konteks:

Saat ini billing module masih memanggil invoice service secara langsung.

Contoh:

billing → InvoiceService.generateInvoiceFromBilling
billing → InvoiceService.sendInvoice

Komunikasi ini harus diubah menjadi domain event.

---

Tujuan implementasi:

1. Menghilangkan dependency billing terhadap invoice module.
2. Menjadikan billing sebagai event producer untuk invoice generation.
3. Menjadikan invoice module sebagai event consumer.

---

Scope perubahan:

src/modules/billing
src/modules/invoice

---

Langkah implementasi:

1. Identifikasi seluruh lokasi pada billing module yang memanggil:

InvoiceService.generateInvoiceFromBilling
InvoiceService.sendInvoice

---

2. Ganti pemanggilan tersebut dengan event emission.

Contoh:

SEBELUM

billing memanggil InvoiceService.generateInvoiceFromBilling

SETELAH

emitDomainEvent("billing.invoice.requested", payload)

---

3. Payload minimal harus berisi:

tenant_id
subscription_id
billing_id
timestamp

---

4. Tambahkan consumer pada invoice module.

Invoice module harus menangani event:

billing.invoice.requested

---

5. Invoice module menghasilkan event berikut setelah invoice dibuat:

billing.invoice.generated

---

6. Invoice module menghasilkan event berikut jika email invoice dikirim:

notification.email.send_requested

---

Verifikasi:

Pastikan billing module tidak lagi mengimpor invoice module.

---

Constraint:

Tidak ada perubahan API endpoint.

Tidak ada perubahan database schema.

Tidak ada perubahan queue configuration.
