BATCH 2 — Hardening Fixes (Patch3 & Patch5)



PATCH 6 — Realtime Event Backpressure Protection

Context
Sistem Absenta sudah production. Patch sebelumnya membuat realtime event non-blocking, tetapi masih ada risiko CPU spike saat burst karena async task terlalu banyak.

Location

src/modules/attendance/gerbang/controllers/gerbang.controller.ts

Task

Tambahkan throttle / debounce untuk realtime fan-out agar event tidak dijalankan setiap tap.

Masalah saat ini:

1 tap
→ async task
→ fetchSockets()
→ rebuild feed

Jika:

500 tap/sec

akan membuat:

500 async tasks/sec

Ini dapat menyebabkan CPU spike.

Instruksi

Tambahkan event throttle per tenant minimal 500ms.

Contoh implementasi yang diharapkan:

BEFORE

void (async () => {
  await redis.publish(...)
  const sockets = await io.in(`tenant:${tenantId}`).fetchSockets()
  ...
})();

AFTER (contoh)

if (!global.realtimeThrottle) global.realtimeThrottle = new Map();

const now = Date.now();
const last = global.realtimeThrottle.get(tenantId) || 0;

if (now - last > 500) {
  global.realtimeThrottle.set(tenantId, now);

  setImmediate(async () => {
    try {
      await redis.publish(...);

      const sockets = await io.in(`tenant:${tenantId}`).fetchSockets();

      for (const s of sockets) {
        const feed = await buildAttendanceFeed(...);
        s.emit('attendance_feed_update', feed);
      }
    } catch {}
  });
}

Tujuan

maksimal 1 realtime fan-out per 500ms per tenant

Batasan

jangan ubah behaviour event

jangan ubah payload event

jangan ubah response API

Output

patch before/after

penjelasan throttle logic

========================================================================

PATCH 7 — Timezone Safe Gate Cache Key

Context
Redis key gate_present harus konsisten dengan timezone tenant.

Location

gerbang.service.ts
sesi.service.ts

Masalah

Key saat ini memakai date dari server.

Jika timezone server berbeda dari tenant, maka key bisa salah hari.

Instruksi

Pastikan key date menggunakan tenant timezone.

Contoh implementasi:

BEFORE

const dayIso = new Date().toISOString().slice(0,10);

AFTER

const dayIso = DateTime.now()
  .setZone(tenantTimezone)
  .toISODate();

Jika project belum memakai luxon, gunakan util timezone yang sudah ada di codebase.

Batasan

jangan ubah behaviour validasi

hanya ubah perhitungan date key

Output

patch before/after

konfirmasi timezone tenant digunakan

========================================================================

PATCH 8 — Strict Redis Cache Value Validation

Context
Cache gate_present harus divalidasi secara eksplisit untuk mencegah false positive.

Location

sesi.service.ts

Masalah

Saat ini:

if (val) gateTap = { id: 'cache' };

Ini bisa true untuk value lain.

Instruksi

Validasi value harus eksplisit.

BEFORE

if (val) gateTap = { id: 'cache' };

AFTER

if (val === '1') gateTap = { id: 'cache' };

Dan saat set cache:

await redis.set(key, '1', { EX: ttl });

Batasan

jangan ubah logic validasi DB fallback

Redis hanya cache layer

Output

patch before/after

konfirmasi Redis value selalu '1'

========================================================================

PATCH 9 — Safe TTL Gate Cache

Context
TTL cache gate_present harus selalu valid.

Location

gerbang.service.ts

Masalah

Jika TTL negatif atau terlalu kecil, cache bisa hilang sebelum hari selesai.

Instruksi

Pastikan TTL minimal 60 detik dan maksimal end-of-day tenant timezone.

Contoh implementasi:

BEFORE

const ttl = endOfDay - now;

AFTER

let ttl = Math.floor((endOfDay - now) / 1000);
if (ttl < 60) ttl = 60;

Batasan

jangan ubah format key

jangan ubah behaviour validasi

Output

patch before/after

konfirmasi TTL aman

========================================================================

PATCH 10 — Redis Failure Safe Mode

Context
Redis hanya cache layer. Jika Redis down, sistem absensi harus tetap berjalan.

Location

gerbang.service.ts
sesi.service.ts

Instruksi

Semua operasi Redis untuk gate_present harus berada dalam try/catch.

Contoh:

try {
  await redis.set(key, '1', { EX: ttl });
} catch {}

dan

try {
  const val = await redis.get(key);
} catch {}

Tujuan

Jika Redis:

down
restart
network issue

sistem tetap fallback ke DB.

Batasan

jangan mengubah behaviour validasi DB

Output

patch before/after

konfirmasi fallback DB tetap bekerja