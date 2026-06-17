BATCH 4 — Final Hardening & Scalability (Patch16–Patch20)

Tanggal: 2026-03-11

PATCH 16 — Prisma Query Parallelization

Location
- src/modules/attendance/sesi-absensi/services/sesi.service.ts

Before

```ts
const siswa = await prisma.siswa.findFirst(...);
const activeYear = await cacheService.getOrSet(...);
```

After

```ts
const [siswa, activeYear] = await Promise.all([
  prisma.siswa.findFirst(...),
  cacheService.getOrSet(...),
]);
```

PATCH 17 — Prisma Connection Pool Safety

Location
- src/utils/prisma.ts

Before

```ts
const prisma = globalThis.__prisma || new PrismaClient(prismaOptions);
```

After

```ts
const applyPrismaPoolDefaults = () => {
  const raw = String(process.env.DATABASE_URL || '').trim();
  const u = new URL(raw);
  if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '20');
  if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20');
  process.env.DATABASE_URL = u.toString();
};
applyPrismaPoolDefaults();
const prisma = globalThis.__prisma || new PrismaClient(prismaOptions);
```

Konfirmasi
- Jika `DATABASE_URL` belum memiliki `connection_limit`/`pool_timeout`, sistem akan menambahkan default aman.
- Jika sudah ada, nilainya tidak diubah.

PATCH 18 — Attendance Feed Build Debounce

Location
- src/modules/attendance/gerbang/controllers/gerbang.controller.ts

Before

```ts
await Promise.all(sockets.map(async (s) => {
  const feed = await buildAttendanceFeed(...params...);
  s.emit('attendance_feed_update', feed);
}));
```

After

```ts
const feedLocks = new Map<string, Promise<any>>();
await Promise.all(sockets.map(async (s) => {
  const params = (s.data as any)?.lastFeedParams || {};
  const uId = String(s.data?.user?.id || '');
  const rName = String(s.data?.user?.roleName || '');
  const k = `${uId}|${rName}|${JSON.stringify(params)}`;
  let lock = feedLocks.get(k);
  if (!lock) {
    lock = buildAttendanceFeed(String(tenantId), uId, rName, params);
    feedLocks.set(k, lock);
  }
  const feed = await lock;
  s.emit('attendance_feed_update', feed);
}));
```

Konfirmasi
- Payload dan hasil feed per-socket tetap sama (berdasarkan user+role+params).
- Jika ada banyak socket dengan konteks sama, feed dibangun sekali saja untuk grup tersebut.

PATCH 19 — Redis Key Namespace Safety

Location
- src/modules/attendance/gerbang/services/gerbang.service.ts
- src/modules/attendance/sesi-absensi/services/sesi.service.ts

Before

```ts
const key = `gate_present:${tenantId}:${dayStr}:${siswaId}`;
```

After

```ts
const key = `absenta:gate_present:${tenantId}:${dayStr}:${siswaId}`;
```

Tambahan (lock key)

Before

```ts
const lockKey = `lock:session:create:${tenantId}:${dayStr}`;
```

After

```ts
const lockKey = `absenta:lock:session:create:${tenantId}:${dayStr}`;
```

PATCH 20 — Logging Level Safety

Location
- src/utils/cache.service.ts
- src/modules/attendance/gerbang/services/gerbang.service.ts

Before

```ts
console.log(`✅ Cache HIT (Redis): ${key}`);
```

After

```ts
if (isDebugLog()) console.log(`✅ Cache HIT (Redis): ${key}`);
```

Konfirmasi
- Log error tetap selalu dicetak (`console.error`).
- Log high-frequency (cache hit/miss/set) tidak membanjiri stdout kecuali `LOG_LEVEL=debug`.

