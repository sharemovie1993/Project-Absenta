Laporan Implementasi — Parent App Event Emission Refactor

- Ubah parent-app agar tidak mengirim notifikasi langsung dan menggantinya dengan event emission: parent.notification.created.
- Update notification worker agar menjadi consumer untuk event parent.notification.created (proses WA + push/PWA + inbox log).
- Hilangkan import langsung parent-app ke notification controller (diganti pemanggilan runtime) pada parent-app routes.

Build: SUCCESS
Errors Remaining: NO
