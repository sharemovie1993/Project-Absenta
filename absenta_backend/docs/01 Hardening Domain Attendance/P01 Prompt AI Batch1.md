Context:
Kita sedang hardening sistem Absenta yang sudah production.

Task:
Audit dan perbaiki semua query pada modul attendance yang tidak memfilter tenant_id.

Scope:
src/modules/attendance/gerbang
src/modules/attendance/sesi-absensi

Contoh temuan:
- gerbang.controller.ts:L112
- gerbang.controller.ts:L1439

Instruksi:
Tambahkan filter tenant_id pada semua query domain berikut:
- siswa lookup
- guru lookup
- absenGerbangSiswa lookup
- endpoint prerequisites

Contoh perubahan yang diharapkan:

BEFORE
where: { siswa_id: siswaId }

AFTER
where: { tenant_id: tenantId, siswa_id: siswaId }

Batasan:
- jangan ubah behaviour bisnis
- jangan ubah response API
- perubahan sekecil mungkin

Output:
1. daftar file yang diubah
2. patch before/after
==================================================================
PATCH 2 — Redis KEYS → SCAN


Context:
Hardening production system.

Task:
Ganti semua penggunaan Redis KEYS dengan SCAN.

Location:
src/utils/cache.service.ts
L126-L152

Masalah:
KEYS adalah blocking operation dan bisa membuat Redis stall saat jumlah key besar.

Instruksi:
Ubah implementasi deletePattern agar menggunakan SCAN + batched DEL.

Contoh:

BEFORE
client.keys(pattern)

AFTER
SCAN cursor MATCH pattern COUNT 100

Batasan:
- jangan ubah behaviour cache
- jangan ubah API cache.service
- hanya ubah implementasi internal

Output:
1. patch before/after
2. konfirmasi tidak ada KEYS tersisa

==================================================================
PATCH 3 — Realtime Event Non-Blocking


Context:
Hardening jalur kritis gerbang.

Task:
Realtime event pada jalur gerbang tidak boleh mem-block response API.

Location:
src/modules/attendance/gerbang/controllers/gerbang.controller.ts
L218-L271

Masalah:
Saat ini redis.publish dan socket operations di-await sebelum response.

Instruksi:
Ubah agar realtime event menjadi non-blocking.

Contoh:

BEFORE
await redis.publish(...)
await socket.emit(...)

AFTER
redis.publish(...).catch(...)
socket.emit(...)

atau gunakan setImmediate / queueMicrotask.

Tujuan:
response API harus dikirim tanpa menunggu realtime event.

Batasan:
- jangan ubah behaviour event
- jangan ubah response API
- patch minimal

Output:
1. patch before/after
2. konfirmasi response API tidak lagi menunggu event

==================================================================
PATCH 4 — Unique Sesi Gerbang


Context:
Hardening database consistency.

Task:
Tambahkan unique constraint untuk memastikan hanya ada satu sesi gerbang per tenant per tanggal.

Location:
prisma/schema.prisma
model SesiGerbang

Instruksi:
Tambahkan constraint:

@@unique([tenant_id, tanggal])

Jika ada potensi konflik data existing, lakukan audit query terlebih dahulu sebelum migration.

Batasan:
- jangan ubah field lain
- migration harus aman untuk production

Output:
1. perubahan schema
2. migration SQL yang dihasilkan
3. konfirmasi tidak merusak data existing

==================================================================
PATCH 5 — Redis Gate Presence Cache

Context:
Hardening performance untuk SaaS scale.

Task:
Tambahkan Redis flag untuk menandai siswa sudah tap gerbang.

Flow yang diinginkan:

Saat gerbang DATANG sukses:
SET gate_present:{tenant}:{date}:{siswa_id} = 1
TTL sampai end of day.

Saat tap sesi:
1. cek Redis flag dulu
2. jika ada → skip query DB
3. jika tidak ada → fallback DB check

Location:
gerbang.service.ts
sesi.service.ts

Batasan:
- behaviour validasi tetap sama
- Redis hanya sebagai cache layer
- DB tetap source of truth

Output:
1. patch kode
2. format key Redis
3. TTL yang digunakan