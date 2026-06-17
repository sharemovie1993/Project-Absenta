Laporan Implementasi — Attendance Event Emission Refactor (Absenta Backend)

Ruang lingkup: menjadikan attendance sebagai event producer dan menghilangkan dependency attendance ke notification dan parent-app melalui mekanisme event bus. Tidak ada perubahan API endpoint, database schema, atau konfigurasi queue.

Yang dilakukan/diubah:
- Menambahkan emitter standar emitDomainEvent untuk publish domain event (events:domain).
- Mengubah attendance (gerbang service, sesi service, manual attendance service, notify controller) dari direct call ke notification/parent-app menjadi emit domain event.
- Menambahkan consumer pada notification worker untuk menerima domain event dan meneruskan ke mekanisme existing (parent-notification queue, emailQueue, WhatsApp service).
- Menjalankan build dan memastikan hasilnya bersih.

