Laporan Implementasi — Billing to Invoice Event Refactor (Absenta Backend)

Ruang lingkup: mengubah komunikasi billing -> invoice dari direct service call menjadi event-driven communication. Tidak ada perubahan database schema atau konfigurasi queue.

Yang dilakukan/diubah:
- Menghapus pemanggilan langsung InvoiceService dari billing module dan menggantinya dengan event emission billing.invoice.requested.
- Menambahkan consumer pada invoice module untuk menangani event billing.invoice.requested dan memproses generate/send invoice.
- Menambahkan event turunan billing.invoice.generated dan notification.email.send_requested dari invoice module.
- Menambahkan inisialisasi invoice event consumer di entrypoint API dan billing worker untuk memastikan pemrosesan event berjalan.
- Menjalankan build dan memastikan hasilnya bersih.

