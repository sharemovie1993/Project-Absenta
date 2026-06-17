Laporan Implementasi — Event Bus Layer Refactor (Absenta Backend)

Ruang lingkup: membersihkan layer infra/event-bus dan realtime subscriber agar hanya plumbing publish/subscribe, tanpa dependency langsung ke src/modules.

Yang dilakukan/diubah:
- Menghapus dependency domain dari infra/event-bus (attendance events) sehingga hanya melakukan publish/broadcast event realtime.
- Menghapus dependency domain dari infra/realtime (socket auth & socket rooms) dengan pola dependency injection (validator parent token, builder attendance feed, provider tenant detail).
- Memindahkan wiring dependency domain ke composition root (main.ts) saat inisialisasi realtime.
- Menjalankan build dan memastikan hasilnya bersih.

