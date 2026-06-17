Audit Hardening Level-2 — Domain Absensi (Berbasis Implementasi Kode)

Tanggal: 2026-03-11

Scope

- src/modules/attendance/gerbang
- src/modules/attendance/sesi-absensi
- prisma/schema.prisma

FINDING #1
Location:
- [gerbang.controller.ts:L218-L271](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L218-L271)

Risk:
- Jalur POST /attendance/gerbang/tap melakukan publish Redis + emit socket + fetchSockets + rebuild feed per-socket sebelum mengirim response (semua awaited).
- Saat burst (jam gerbang), waktu response jadi O(jumlah socket aktif tenant). Jika tenant punya banyak dashboard terbuka, 1 tap memicu banyak query/feed build → latency spike, request timeout, dan backpressure ke DB/Redis/Socket.

Recommendation:
- Jangan menunggu proses realtime sebelum response. Ubah menjadi fire-and-forget (tanpa await), atau pindahkan ke worker/event consumer.
- Hindari rebuild feed per tap. Gunakan event incremental (client refresh periodik atau debounce/throttle).

FINDING #2
Location:
- [gerbang.controller.ts:L112-L123](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L112-L123)

Risk:
- Otorisasi role SISWA pada endpoint gerbang melakukan lookup siswa tanpa filter tenant (`prisma.siswa.findFirst({ where: { user_id: userId } })`) dan lookup petugas juga tanpa tenant filter.
- Pada SaaS multi-tenant, ini membuka risiko salah identifikasi tenant/kelas petugas dan potensi akses lintas tenant (data leakage/authorization bypass) terutama jika user_id reuse/relasi salah.

Recommendation:
- Pastikan semua lookup domain absensi memfilter tenant_id (siswa/guru/struktur). Contoh: `{ where: { user_id: userId, tenant_id: tenantId } }`.

FINDING #3
Location:
- [gerbang.controller.ts:L227-L267](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L227-L267)

Risk:
- Publish Redis (`await redis.publish`) dan operasi socket dilakukan dalam try/catch, tapi tetap awaited. Jika Redis/Socket lambat, request tap ikut lambat.
- Saat Redis sedang tinggi (autoscaler/monitoring) atau socket server penuh, ini memperpanjang critical path gerbang.

Recommendation:
- Gunakan non-blocking publish (tanpa await) dan fail-fast; atau kirim event via worker/queue terpisah.

FINDING #4
Location:
- [gerbang.service.ts:L784-L815](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L784-L815)

Risk:
- `checkDuplicateTap` melakukan query DB per tap (filter tenant+siswa+arah+range waktu_tap) dan `include` relasi SesiGerbang.
- Pada burst, ini menjadi hotspot read tambahan yang sebenarnya tidak diperlukan untuk menjaga idempotensi (karena sudah ada unique constraint).
- Ada potensi race: dua request bersamaan bisa sama-sama “tidak menemukan” record di checkDuplicateTap, lalu sama-sama lanjut ke write (lihat FINDING #9).

Recommendation:
- Untuk jalur kritis, lepaskan duplicate pre-check dan andalkan unique constraint + create/catch P2002 (atau implementasi setara) untuk idempotensi.
- Jika butuh UX “duplicate”, lakukan best-effort post-commit (async) atau hanya di sisi client (debounce).

FINDING #5
Location:
- [gerbang.service.ts:L1135-L1219](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L1135-L1219)

Risk:
- `getOrCreateSessionInfo` dipanggil pada jalur tap (lihat juga L771) sehingga setiap tap melakukan minimal 1 query `sesiGerbang.findFirst`.
- Pembuatan sesi harian memakai Redis lock `EX 5` (5 detik) tanpa mekanisme extend. Jika DB lambat dan lock habis, request lain dapat membuat sesi ganda.
- Model `SesiGerbang` tidak memiliki unique constraint untuk mencegah sesi duplikat per tenant+tanggal (lihat prisma di FINDING #6).
- Jika sesi ganda terjadi, validasi prasyarat gerbang dan laporan bisa inkonsisten karena query `findFirst` dapat mengambil sesi yang berbeda.

Recommendation:
- Tambahkan unique constraint pada SesiGerbang (mis. `[tenant_id, tanggal]` atau `[tenant_id, sekolah_id, tanggal]`).
- Cache session id per tenant+day di Redis (TTL sampai endOfDay) untuk menghindari `findFirst` per tap.
- Naikkan TTL lock + extend (heartbeat) atau gunakan lock library yang aman.

FINDING #6
Location:
- [schema.prisma:L1085-L1104](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1085-L1104)

Risk:
- `SesiGerbang` hanya memiliki index, tidak ada `@@unique` untuk “1 sesi per tenant per tanggal”.
- Saat burst + contention lock, kemungkinan sesi ganda meningkat (lihat FINDING #5).

Recommendation:
- Tambahkan `@@unique([tenant_id, tanggal])` atau desain yang sesuai kebutuhan sekolah_id.

FINDING #7
Location:
- [gerbang.service.ts:L920-L1013](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L920-L1013)

Risk:
- Transaction scope pada tap gerbang memuat banyak operasi read (tahunPelajaran, kelas, tenant config, special event) lalu write (upsert).
- Pada Postgres, transaksi panjang mengonsumsi connection lebih lama; saat burst (2M tap/20 menit), ini memperbesar risiko connection pool exhaustion dan throughput turun.
- Banyak read di dalam transaksi tidak memberi benefit atomicity untuk satu row insert/update.

Recommendation:
- Minimalkan transaction scope: lakukan read non-kritis di luar transaksi atau hilangkan transaksi sama sekali dan lakukan single INSERT/CREATE yang idempotent.

FINDING #8
Location:
- [schema.prisma:L1106-L1137](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1106-L1137)
- [gerbang.service.ts:L986-L1013](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L986-L1013)

Risk:
- Idempotensi gerbang aman karena unique key `@@unique([sesi_gerbang_id, siswa_id, arah])` + upsert.
- Namun, implementasi saat ini mengandalkan “duplicate pre-check” untuk menentukan duplicate; race masih mungkin jika dua request bersamaan melewati pre-check.

Recommendation:
- Untuk benar-benar race-safe pada burst: gunakan “insert-first” (create) dan tangani P2002 sebagai duplicate tanpa melakukan update.

FINDING #9
Location:
- [gerbang.service.ts:L1015-L1020](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L1015-L1020)

Risk:
- `isNew` ditentukan dari selisih `created_at` dan `updated_at` < 2000ms.
- Pada race request: request kedua bisa masuk jalur UPDATE (via upsert) segera setelah CREATE dan selisih timestamp bisa <2 detik → `isNew` salah (true) → event/log/notif dianggap “new” padahal duplicate.
- Ini berbahaya saat jam gerbang: notifikasi ganda, activity log ganda, dan load tambahan.

Recommendation:
- Jangan pakai heuristik waktu untuk menentukan insert vs update pada jalur idempotent. Gunakan mekanisme yang deterministik (create + catch unique violation) atau DB RETURNING.

FINDING #10
Location:
- [sesi.service.ts:L401-L416](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L401-L416)

Risk:
- Validasi prasyarat gerbang di tap sesi membaca DB `AbsenGerbangSiswa.findFirst` untuk setiap tap sesi.
- Pada skenario 2000 sekolah × 1000 siswa (2M validasi), ini menghasilkan 2M read tambahan ke tabel gerbang (meski terindeks).
- Jika sesi/kelas juga padat, DB read+write contention meningkat (bottleneck DB).

Recommendation:
- Tambahkan Redis flag per siswa per hari ketika gerbang “DATANG” sukses (TTL sampai endOfDay). Tap sesi cek Redis dulu (O(1)), fallback ke DB jika miss.

FINDING #11
Location:
- [sesi.service.ts:L370-L523](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L370-L523)

Risk:
- Tap sesi melakukan banyak query serial: sesiAbsensi, config timezone, gate session (cached 60s), gateTap, siswa, activeYear, activeSemester, siswaAkademik, existing absenSiswa, lalu create/update.
- Pada burst, query-per-request tinggi → latency naik dan DB menjadi bottleneck (qps tinggi).

Recommendation:
- Cache activeYear + activeSemester per tenant (TTL menit) menggunakan CACHE_KEYS.ACADEMIC.*.
- Kurangi query serial: gabungkan beberapa lookup menjadi `Promise.all` bila memungkinkan (tanpa mengubah aturan).
- Implement Redis gate-present flag (lihat FINDING #10) untuk menghapus 1 query DB pada jalur terpadat.

FINDING #12
Location:
- [cache.service.ts:L31-L96](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts#L31-L96)
- [cache.service.ts:L161-L187](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts#L161-L187)

Risk:
- Cache layer melakukan `console.log` pada HIT/MISS/SET untuk setiap request. Pada burst traffic, ini menambah CPU overhead dan I/O stdout yang signifikan (bisa jadi bottleneck sendiri).
- `getOrSet` tidak memiliki singleflight/lock, sehingga saat cache MISS bersamaan, banyak request memanggil `fetchFunction` sekaligus (stampede).

Recommendation:
- Matikan log default (gating via env/level).
- Implement singleflight per key (lock ringan) agar hanya 1 fetch berjalan saat miss.

FINDING #13
Location:
- [cache.service.ts:L126-L152](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts#L126-L152)

Risk:
- `deletePattern` memakai `client.keys(pattern)` yang bersifat blocking pada Redis (O(N) keys) dan dapat menghentikan Redis saat key banyak.
- Pada SaaS ribuan tenant, key Redis bisa sangat banyak; operasi invalidasi bisa membuat Redis stall dan berdampak ke jalur real-time (autoscaler/infra monitoring/attendance cache).

Recommendation:
- Ganti KEYS dengan SCAN + batched DEL.
- Pastikan invalidasi pattern tidak dijalankan di jalur kritis.

FINDING #14
Location:
- [gerbang.controller.ts:L1439-L1472](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L1439-L1472)

Risk:
- Endpoint `/attendance/gerbang/prerequisites/:siswa_id` membaca `absenGerbangSiswa` tanpa filter tenant_id.
- Ini potensi data leakage lintas tenant pada SaaS (siswa_id UUID bisa direferensikan lintas tenant).

Recommendation:
- Tambahkan `tenant_id: tenantId` pada query gateTap.

FINDING #15
Location:
- [schema.prisma:L1106-L1136](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1106-L1136)

Risk:
- Tabel `AbsenGerbangSiswa` punya index `@@index([tenant_id, created_at])`. Pada burst insert, `created_at` monotonik → hot index page (rightmost) → lock contention meningkat pada write heavy.
- Risiko ini muncul saat jam gerbang (insert rate tinggi).

Recommendation:
- Evaluasi kebutuhan index `created_at` untuk jalur operasional. Jika dibutuhkan untuk laporan, pertimbangkan partition per hari/tenant atau strategi indexing lain.

FINDING #16
Location:
- [schema.prisma:L929-L958](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L929-L958)
- [sesi.service.ts:L524-L560](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L524-L560)

Risk:
- Jalur sesi sudah cukup aman terhadap race create karena unique `@@unique([sesi_id, siswa_akademik_id])` + handling P2002 (retry update).
- Namun tetap ada tambahan query saat race terjadi (re-fetch) dan jika race sering (double scan), DB load naik.

Recommendation:
- Pertahankan ini (sudah benar untuk correctness). Optimasi lebih lanjut: gunakan create/catch untuk jalur umum dan minimalkan update ulang jika status sama.

FINDING #17
Location:
- [gerbang.controller.ts:L181-L216](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L181-L216)

Risk:
- Response payload untuk gerbang membangun metadata cukup besar setiap request (object allocation + serialization).
- Ini bukan bottleneck utama, tetapi pada ratusan RPS bisa menambah GC pressure bila ditambah operasi berat lain (lihat FINDING #1).

Recommendation:
- Untuk mode high-load, pertimbangkan response minimal untuk device (mis. “OK + timestamp + status”) dan metadata lengkap hanya untuk dashboard.

🔟 SaaS Scalability Risk (Top 3)

RISK #1: Realtime fan-out di jalur gerbang (before response)
- Referensi: [gerbang.controller.ts:L218-L271](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L218-L271)
- Muncul saat: banyak dashboard/parent app socket aktif + jam gerbang.
- Bahaya: latency explode, DB/Redis overload, request drop.

RISK #2: DB query-per-tap terlalu tinggi (gerbang + sesi)
- Referensi: [gerbang.service.ts:L740-L815](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L740-L815), [gerbang.service.ts:L1135-L1152](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts#L1135-L1152), [sesi.service.ts:L370-L523](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts#L370-L523)
- Muncul saat: 2M+ tap/20 menit (multi tenant).
- Bahaya: DB jadi bottleneck utama (qps tinggi, pool exhaustion).

RISK #3: Redis cache layer bisa jadi bottleneck (log spam + KEYS)
- Referensi: [cache.service.ts:L31-L96](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts#L31-L96), [cache.service.ts:L126-L152](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts#L126-L152)
- Muncul saat: traffic tinggi + invalidasi pattern / banyak cache hit/miss.
- Bahaya: Redis stall, mengganggu autoscaler/monitoring/attendance cache, memperparah latency.

