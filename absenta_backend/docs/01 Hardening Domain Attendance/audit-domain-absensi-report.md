Audit Global Domain Absensi — Laporan Berbasis Kode

Tanggal: 2026-03-11

Ringkasan Temuan Utama

- Jalur “absensi gerbang” bersifat idempotent (upsert) dan tidak bergantung pada worker untuk commit DB.
- Jalur “absensi sesi/kelas” memvalidasi prasyarat gerbang dengan membaca DB (dengan cache untuk sesi gerbang), dan memakai unique constraint + retry untuk race.
- Potensi bottleneck terbesar untuk SaaS ribuan sekolah ada pada burst write/read DB saat jam gerbang + validasi sesi yang masih DB-first untuk gate prerequisite (belum ada Redis flag khusus per siswa untuk prasyarat).
- Perbaikan kecil sudah diterapkan agar prasyarat “gerbang wajib tercatat dulu” lebih robust: logging/notif tidak lagi mem-block commit gerbang (sudah dipindah post-commit) dan query kelas di transaksi gerbang dipastikan tenant-safe.

1️⃣ Entry Point Absensi

A. Gerbang (Absensi Gerbang)

- Prefix modul attendance: [plugin.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/plugin.ts#L1-L60)
- Routes gerbang: [gerbang.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/routes/gerbang.routes.ts#L1-L220)
  - POST /api/attendance/gerbang/tap (RFID/QR tap): handler [gerbangController.tap](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts)
  - POST /api/attendance/gerbang/face-verify: handler [gerbangController.faceVerifyTap](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts)
  - POST /api/attendance/gerbang/bypass (privileged): handler [gerbangController.bypass](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts)
  - Endpoint pendukung (sessions/status/history/present/not-present/absence/stats/health) juga ada di file routes yang sama.
- Service utama gerbang: [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts)

Alur controller → service → DB

- gerbangController.tap → gerbangService.tap → validateTapInput → checkDuplicateTap → validateModeSpecificRules → processTapTransaction → prisma.$transaction + tx.absenGerbangSiswa.upsert
  - Entry service: [tap](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L177-L324)
  - Persist/commit: [processTapTransaction](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L912-L1116)

B. Sesi/Kelas (Absensi Sesi)

- Routes sesi: [sesi-absensi.routes.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/routes/sesi-absensi.routes.ts#L1-L113)
  - POST /api/attendance/sesi-absensi (buat sesi)
  - GET /api/attendance/sesi-absensi (list)
  - PATCH /api/attendance/sesi-absensi/:id/status (close sesi)
  - PUT/DELETE /api/attendance/sesi-absensi/:id
  - POST /api/attendance/sesi-absensi/:id/tap-siswa (scan siswa)
  - PATCH /api/attendance/sesi-absensi/:id/absen-guru/:guru_id
  - GET /api/attendance/sesi-absensi/:id/absen-siswa, GET /:id/summary
- Controller: [sesi-absensi.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/controllers/sesi-absensi.controller.ts)
- Guard/Scope: [sesi.guard.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/guards/sesi.guard.ts)
- Service: [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts)

Alur controller → service → DB

- sesiAbsensiController.tapSiswa → sesiService.tapSiswa → validasi gate prerequisite (sesi gerbang via cache + gate tap via DB) → create/update AbsenSiswa
  - Tap siswa: [tapSiswa](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L363-L623)

2️⃣ Flow Pencatatan Absensi Gerbang

A. Transaksi & commit timing

- Pencatatan gerbang dilakukan dalam prisma.$transaction, dengan upsert AbsenGerbangSiswa: [processTapTransaction](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L931-L1116)
- Yang sifatnya turunan (notification & activity log) dijalankan post-commit dan tidak mem-block response. Ini mencegah kasus “gerbang tap gagal tercatat” karena log/notif overload.

B. Idempotent & field unik anti duplikasi

- Model DB memiliki unique constraint untuk mencegah duplikasi tap yang sama pada sesi gerbang yang sama:
  - [schema.prisma (AbsenGerbangSiswa)](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1106-L1137)
  - @@unique([sesi_gerbang_id, siswa_id, arah])
- Persist di service memakai upsert pada key di atas, sehingga aman untuk retry/device resend:
  - [gerbang.service.ts upsert](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L986-L1013)

C. Risiko retry/duplicate/race

- Retry device: aman (upsert + unique).
- Double tap cepat: ada pre-check (checkDuplicateTap), tetapi perlindungan utama tetap unique+upsert.
- Race di pembuatan sesi gerbang harian: sudah ada Redis lock (double-checked locking) di [getOrCreateSessionInfo](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L1122-L1219).

3️⃣ Flow Validasi Absensi Sesi (Prasyarat Gerbang)

A. Mekanisme validasi saat tap-siswa

- Sesi absensi mengecek sesi gerbang harian (cached) lalu mengecek gate tap siswa di DB:
  - Cache sesi gerbang: [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L401-L408)
  - Validasi gate tap DB-first: [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L409-L416)
- Jika gate tap tidak ditemukan, sesi ditolak:
  - Error: “Gate belum tercatat: wajib tap gerbang datang sebelum absen sesi”

B. Query & index yang dipakai (kinerja)

- Query gateTap mem-filter tenant_id + sesi_gerbang_id + siswa_id + arah.
- Index tersedia untuk query tersebut:
  - [schema.prisma (AbsenGerbangSiswa indexes)](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1131-L1136)
  - @@index([tenant_id, sesi_gerbang_id, siswa_id, arah])

C. Cache (Redis flag) belum ada untuk prerequisite per siswa

- Saat ini cache hanya untuk “sesi gerbang harian”, bukan “flag siswa sudah gerbang datang”.
- Untuk SaaS ribuan sekolah (burst besar), rekomendasi teknis: tambahkan Redis flag per siswa per hari (gate-present) agar validasi sesi bisa Redis-first dan DB fallback.

4️⃣ Konsistensi Event Gerbang → Sesi

Skenario risiko:

- gerbang tap dan sesi tap dilakukan hampir bersamaan (mis. perangkat berbeda/latency tinggi)
- sesi memvalidasi sebelum transaksi gerbang commit → sesi ditolak sementara (“gerbang belum tercatat”)

Status saat ini:

- Commit gerbang tidak bergantung pada worker, sehingga window “belum commit” minimal.
- Tetapi tetap ada kemungkinan race bila sesi dan gerbang benar-benar simultan.

Mitigasi yang direkomendasikan (belum diimplementasikan):

- Redis “inflight marker” saat gerbang mulai diproses (EX pendek), sesi jika tidak menemukan gateTap bisa retry singkat jika marker ada.
- Redis gate-present flag post-commit (untuk mempercepat validasi sesi dan mengurangi query DB).

5️⃣ Idempotency dan Retry Safety

A. Gerbang

- Idempotent: upsert + unique constraint (lihat poin 2).
- Device retry/duplicate request tidak membuat record ganda.

B. Sesi/Kelas

- Unique constraint di AbsenSiswa mencegah duplikasi per sesi & siswa_akademik:
  - [schema.prisma (AbsenSiswa)](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L929-L958)
  - @@unique([sesi_id, siswa_akademik_id])
- Implementasi menangani race (P2002) dengan re-fetch lalu update:
  - [sesi.service.ts P2002 handling](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L524-L560)

6️⃣ Dependency ke Worker Queue

- Gerbang: commit DB tidak bergantung worker; worker digunakan untuk proses turunan (notifikasi).
  - Notification via queue: [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts)
- Sesi: notifikasi parent dikirim lewat queue; proses notif lain (WA/email) sudah non-blocking.
  - Parent queue: [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L571-L589)

7️⃣ Latency Jalur Gerbang

Operasi yang terjadi sebelum response gerbang:

- Validasi input + tenant mode + student lookup (validateTapInput)
- Duplicate check
- Mode-specific validation
- prisma.$transaction (upsert gerbang)
- Build response data (ringan)

Catatan penting untuk jam sibuk:

- Ada logging metrik latency untuk GATE: [logTapPerformance](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L1265-L1299)
- Rekomendasi lanjutan: cache systemConfig aktif per tenant (TTL pendek) agar tidak query berulang saat burst.

8️⃣ Struktur Data Absensi (DB)

- SesiAbsensi: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L849-L884)
- AbsenSiswa: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L929-L958)
- SesiGerbang & AbsenGerbangSiswa: [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1085-L1137)

Index untuk query harian:

- SesiAbsensi: @@index([tenant_id, kelas_id, tanggal]) mempercepat list per hari dan kelas.
- AbsenGerbangSiswa: @@index([tenant_id, sesi_gerbang_id, siswa_id, arah]) mempercepat validasi gate prerequisite.
- AbsenSiswa: @@index([tenant_id, sesi_id, siswa_akademik_id]) mempercepat akses per sesi.

9️⃣ Potensi Race Condition

- Gerbang: sesi harian memakai Redis lock; tap record memakai upsert unique → aman untuk retry/double tap.
- Sesi: create/update AbsenSiswa punya fallback P2002 → aman untuk race create.
- Masih ada race “gerbang commit vs sesi validate” bila request simultan; mitigasi ada di poin 4.

🔟 Integritas Data Multi Tenant

Yang sudah baik:

- Mayoritas query mem-filter tenant_id (gerbang & sesi).
- Guard sesi memastikan akses kelas sesuai scope tenant + struktur.

Temuan & perbaikan yang diterapkan:

- Di transaksi gerbang, lookup kelas sebelumnya hanya berdasarkan id; sekarang ditambah tenant_id untuk menjaga isolasi tenant:
  - [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L931-L936)

Catatan desain:

- Model SiswaAkademik tidak memiliki tenant_id, sehingga isolasi tenant bergantung pada foreign key (siswa/kelas) dan UUID global. Ini umum, tapi jika ingin aturan “semua query harus tenant-filter”, struktur tabel perlu ditambah tenant_id dan backfill.

Perbaikan Tambahan yang Diterapkan Saat Audit (untuk stabilitas beban)

- Activity log untuk tap sesi dibuat non-blocking agar tidak memperlambat response dan tidak menggagalkan transaksi inti:
  - [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L571-L620)

