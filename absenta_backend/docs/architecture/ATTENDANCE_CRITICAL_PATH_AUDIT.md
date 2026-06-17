# ATTENDANCE CRITICAL PATH AUDIT — Real-time Write Verification

Tanggal: 2026-03-15

Tujuan
- Memastikan refactor arsitektur tidak mengubah desain real-time: **tap gerbang** dan **tap sesi** wajib **write langsung ke DB** (tanpa queue/worker untuk write utama).

Lingkup
- `src/modules/attendance/gerbang`
- `src/modules/attendance/sesi-absensi`

---

## 1) Apakah write absensi gerbang dilakukan langsung ke DB?
Status: YES

Endpoint
- `POST /api/attendance/gerbang/tap`

Fakta implementasi (alur aktual)
- Controller menerima request dan melakukan validasi + authorization checks, lalu memanggil service:
  - [gerbang.controller.ts:L47-L179](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L47-L179)
- Service memproses tap dan mendelegasikan transaksi write ke fungsi transaction:
  - Entry service: [gerbang.service.ts:L186-L266](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L186-L266)
  - Delegasi transaksi: [gerbang.service.ts:L242](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L242)
- Write utama dilakukan langsung via Prisma dalam 1 DB transaction:
  - Transaction wrapper: [gerbang.tap-transaction.ts:L32](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.tap-transaction.ts#L32)
  - Write attendance: `tx.absenGerbangSiswa.create(...)` [gerbang.tap-transaction.ts:L80-L97](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.tap-transaction.ts#L80-L97)
- Repository layer adalah wrapper Prisma langsung:
  - [gerbang.db.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/repositories/gerbang.db.ts)

Tidak ada enqueue job sebelum write DB
- Tidak ditemukan pemanggilan queue/bullmq/enqueue pada modul gerbang untuk flow tap.
- Side-effect (notification/log) dilakukan setelah transaksi sukses, melalui publish event:
  - `emitDomainEvent({ event_type: 'attendance.tap', ... })` berjalan setelah transaksi (async) [gerbang.tap-transaction.ts:L136-L230](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.tap-transaction.ts#L136-L230)

Catatan penting (masih “direct DB write”)
- Ada create otomatis `SesiGerbang` (dan `Sekolah` default jika belum ada) ketika belum ada sesi harian. Ini juga dilakukan langsung ke DB, bukan worker:
  - Lock Redis + create sesi: [gerbang.session-helpers.ts:L25-L102](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.session-helpers.ts#L25-L102)

---

## 2) Apakah write absensi sesi dilakukan langsung ke DB?
Status: YES

Endpoint
- `POST /api/attendance/sesi-absensi/:id/tap-siswa`

Fakta implementasi (alur aktual)
- Controller hanya memanggil service (tanpa DB write):
  - [sesi-absensi.controller.ts:L171-L200](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/controllers/sesi-absensi.controller.ts#L171-L200)
- Service melakukan validasi prerequisite “tap gerbang datang” lalu write attendance langsung:
  - Entry service: [sesi.service.ts:L380](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L380)
  - Gate prerequisite check menggunakan Redis cache `absenta:gate_present:*` (kalau miss, fallback ke DB read) [sesi.service.ts:L418-L441](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L418-L441)
  - Write attendance dilakukan langsung:
    - Update: [sesi.service.ts:L529-L540](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L529-L540)
    - Create: [sesi.service.ts:L541-L559](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L541-L559)
    - Retry on unique constraint (race) tetap dilakukan dengan update langsung [sesi.service.ts:L561-L596](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L561-L596)
- Repository layer adalah wrapper Prisma langsung:
  - [sesi.db.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/repositories/sesi.db.ts)

Tidak ada enqueue job sebelum write DB
- Tidak ditemukan enqueue/queue usage pada flow `tapSiswa`. Setelah write berhasil barulah:
  - publish redis event untuk realtime UI update [sesi.service.ts:L598-L602](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L598-L602)
  - emit domain event untuk notification side-effect [sesi.service.ts:L608-L625](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L608-L625)

---

## 3) Apakah worker hanya menangani side-effect?
Status: MIXED (critical path endpoints OK, tetapi ada background job yang menulis attendance)

Dalam critical path endpoint tap
- `gerbang/tap` dan `sesi-absensi/:id/tap-siswa` tidak menggunakan worker/queue untuk write attendance utama (lihat bagian 1–2).
- Worker/queue dipakai untuk side-effect via event:
  - Notification downstream dipicu melalui `emitDomainEvent` (publish event), bukan mengganti DB write utama.

Temuan yang menulis attendance di background (di luar tap endpoint)
- `attendanceAutoClose.job.ts` melakukan createMany `AbsenSiswa` (ALPA) saat finalisasi sesi (background job):
  - Write: [attendanceAutoClose.job.ts:L66-L80](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/attendanceAutoClose.job.ts#L66-L80)

Catatan
- Jika aturan “worker tidak boleh create/update attendance record” ditafsirkan secara absolut (tanpa pengecualian), maka job ini perlu direview (mis. dipindah menjadi proses sinkron saat close sesi, atau dianggap “reconciliation” yang disetujui).

---

## 4) Redis usage (apakah sesuai)
Status: PASS (Redis tidak menjadi source of truth attendance)

Gerbang
- Redis dipakai untuk:
  - lock create sesi harian (`NX/EX`) [gerbang.session-helpers.ts:L43-L58](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.session-helpers.ts#L43-L58)
  - cache “gate present” per siswa per hari (TTL sampai end-of-day) [gerbang.session-helpers.ts:L8-L22](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.session-helpers.ts#L8-L22)

Sesi absensi
- Redis dipakai untuk:
  - membaca cache `absenta:gate_present:*` sebagai shortcut prerequisite, fallback tetap ke DB [sesi.service.ts:L418-L441](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L418-L441)
  - publish event untuk realtime update UI (channel event), setelah DB write [sesi.service.ts:L598-L602](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L598-L602)

---

## 5) Diagram flow aktual (request → DB write)
### A. Gerbang Tap Flow — POST /attendance/gerbang/tap
```
HTTP POST /api/attendance/gerbang/tap
  ↓
gerbangController.tap
  ↓
gerbangService.tap
  ↓
getOrCreateSessionInfo (DB read/create SesiGerbang; Redis lock NX/EX)
  ↓
processTapTransaction
  ↓
gerbangDb.$transaction(...)
  ↓
tx.absenGerbangSiswa.create(...)  ← WRITE UTAMA (langsung Prisma → DB)
  ↓
response ke client
  ↓
(side effects) emitDomainEvent('attendance.tap'), activityLog, redis publish/socket update
```

### B. Sesi Absensi Flow — POST /attendance/sesi-absensi/:id/tap-siswa
```
HTTP POST /api/attendance/sesi-absensi/:id/tap-siswa
  ↓
sesiAbsensiController.tapSiswa
  ↓
sesiService.tapSiswa
  ↓
prerequisite check:
  - Redis get absenta:gate_present:* (cache)
  - fallback DB read absenGerbangSiswa (jika cache miss)
  ↓
prisma.absenSiswa.create/update(...)  ← WRITE UTAMA (langsung Prisma → DB)
  ↓
response ke client
  ↓
(side effects) redis publish session update + emitDomainEvent('attendance.session.tap') + notifications
```

---

## 6) File yang melakukan write attendance
### Critical path (tap endpoints)
- Gerbang:
  - `AbsenGerbangSiswa` write: [gerbang.tap-transaction.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.tap-transaction.ts)
  - `SesiGerbang` auto-create (jika belum ada): [gerbang.session-helpers.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.session-helpers.ts)
- Sesi absensi:
  - `AbsenSiswa` write: [sesi.service.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts)

### Non-critical (tetap menulis attendance, perlu diketahui)
- Propagasi status gate absence ke sesi aktif (dipanggil langsung dari service, bukan worker):
  - [propagate-gate-absence.command.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/commands/propagate-gate-absence.command.ts)
  - [propagate-gate-absences-batch.command.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/commands/propagate-gate-absences-batch.command.ts)
- Background job (menulis ALPA saat finalisasi sesi):
  - [attendanceAutoClose.job.ts](file:///C:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/jobs/attendanceAutoClose.job.ts)

