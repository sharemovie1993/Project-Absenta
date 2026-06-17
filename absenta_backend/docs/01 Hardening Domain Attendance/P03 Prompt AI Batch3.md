BATCH 3 — Hardening & Performance (Patch11–Patch15)

Context
Sistem Absenta sudah production dan telah melalui Batch-1 dan Batch-2 hardening.
Batch ini fokus pada:

cache stability
DB load reduction
memory safety

Perubahan harus minimal dan aman, tidak boleh mengubah behaviour bisnis.

=======================================================================
PATCH 11 — Realtime Throttle Memory Safety

Context
Patch6 menambahkan realtime throttle menggunakan globalThis.__realtimeThrottle.

Namun Map tersebut dapat terus bertambah jika banyak tenant aktif.

Location

src/modules/attendance/gerbang/controllers/gerbang.controller.ts

Task

Tambahkan cleanup ringan agar Map tidak tumbuh tanpa batas.

Instruksi

Tambahkan guard sebelum penggunaan Map.

Contoh implementasi:

BEFORE

if (!g.__realtimeThrottle) g.__realtimeThrottle = new Map<string, number>();

AFTER

if (!g.__realtimeThrottle) g.__realtimeThrottle = new Map<string, number>();

if (g.__realtimeThrottle.size > 10000) {
  g.__realtimeThrottle.clear();
}

Tujuan

mencegah memory growth jika tenant banyak

Batasan

jangan ubah logic throttle

hanya tambahkan safety guard

Output

patch before/after

=======================================================================
PATCH 12 — Redis Gate Cache Safe TTL Clamp

Context
Patch9 sudah membuat TTL minimal 60 detik.
Namun TTL juga perlu dibatasi agar tidak terlalu besar jika perhitungan timezone salah.

Location

gerbang.service.ts

Task

Tambahkan TTL clamp maksimal 86400 detik (1 hari).

Instruksi

BEFORE

let ttlSeconds = Math.max(60, Math.floor((endOfDay.getTime() - Date.now()) / 1000));

AFTER

let ttlSeconds = Math.floor((endOfDay.getTime() - Date.now()) / 1000);

ttlSeconds = Math.max(60, ttlSeconds);
ttlSeconds = Math.min(ttlSeconds, 86400);

Tujuan

TTL tidak pernah negatif
TTL tidak pernah >1 hari

Batasan

jangan ubah key format

jangan ubah behaviour cache

Output

patch before/after

=======================================================================
PATCH 13 — Cache Stampede Protection

Context
cache.service.getOrSet() dapat mengalami cache stampede jika banyak request miss bersamaan.

Location

src/utils/cache.service.ts

Task

Tambahkan singleflight lock sederhana per key.

Instruksi

Tambahkan Map global untuk lock.

Contoh implementasi minimal:

const g: any = globalThis as any;
if (!g.__cacheLocks) g.__cacheLocks = new Map();

Saat cache miss:

BEFORE

const data = await fetchFunction();

AFTER

let lock = g.__cacheLocks.get(key);

if (!lock) {
  lock = fetchFunction().finally(() => g.__cacheLocks.delete(key));
  g.__cacheLocks.set(key, lock);
}

const data = await lock;

Tujuan

hanya 1 fetchFunction berjalan per key saat miss

Batasan

jangan ubah signature getOrSet

patch minimal

Output

patch before/after

=======================================================================
PATCH 14 — Academic Config Cache

Context
Beberapa query konfigurasi akademik sering dipanggil:

activeYear
activeSemester

Ini bisa menjadi query hotspot saat burst attendance.

Location

sesi.service.ts

Task

Tambahkan cache Redis menggunakan cacheService.getOrSet.

Instruksi

BEFORE

const activeYear = await prisma.tahunPelajaran.findFirst(...)

AFTER

const activeYear = await cacheService.getOrSet(
  CACHE_KEYS.ACADEMIC.YEAR(tenantId),
  async () => prisma.tahunPelajaran.findFirst(...),
  300
);

TTL

300 detik

Batasan

jangan ubah query

hanya tambahkan caching

Output

patch before/after

=======================================================================
PATCH 15 — Remove Duplicate Pre-Check Query

Context
checkDuplicateTap() masih melakukan query tambahan sebelum upsert.

Namun sistem sudah memiliki:

unique constraint
upsert

Query ini hanya menambah DB read saat burst attendance.

Location

gerbang.service.ts

Task

Hilangkan query duplicate pre-check dan langsung gunakan upsert / create + catch unique error.

Instruksi

BEFORE

checkDuplicateTap()
→ DB query
→ upsert

AFTER

upsert langsung

Jika terjadi duplicate, gunakan:

unique constraint handling

Tujuan

mengurangi query DB saat jam gerbang

Batasan

behaviour tetap idempotent

jangan ubah struktur tabel

Output

patch before/after