Laporan Implementasi — Payment Event Emission Refactor

- Refactor payment workflow agar emit domain event: payment.succeeded dan payment.failed.
- Hapus dependency langsung payment terhadap billing module dan notification module.
- Tambah consumer di billing untuk memproses event payment.succeeded (update billing/invoice/subscription via billingService.markAsPaid).
- Tambah consumer di notification worker untuk memproses event payment.succeeded dan payment.failed (email + WhatsApp).
- Sesuaikan payment reconciliation job agar tidak memanggil billingService secara langsung dan memicu pemrosesan via event.
- Update wiring startup (main + billing worker) untuk menginisialisasi consumer billing payment event.

Build: SUCCESS
Errors Remaining: NO
