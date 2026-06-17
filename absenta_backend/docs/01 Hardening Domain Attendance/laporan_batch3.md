BATCH 3 — Hardening & Performance (Patch11–Patch15)

Tanggal: 2026-03-11

PATCH 11 — Realtime Throttle Memory Safety

Location
- src/modules/attendance/gerbang/controllers/gerbang.controller.ts

Before

```ts
if (!g.__realtimeThrottle) g.__realtimeThrottle = new Map<string, number>();
```

After

```ts
if (!g.__realtimeThrottle) g.__realtimeThrottle = new Map<string, number>();
if (g.__realtimeThrottle.size > 10000) {
  g.__realtimeThrottle.clear();
}
```

PATCH 12 — Redis Gate Cache Safe TTL Clamp (max 86400)

Location
- src/modules/attendance/gerbang/services/gerbang.service.ts (markGatePresent)

Before

```ts
const ttlSeconds = Math.max(60, Math.floor((endOfDay.getTime() - Date.now()) / 1000));
```

After

```ts
let ttlSeconds = Math.floor((endOfDay.getTime() - Date.now()) / 1000);
ttlSeconds = Math.max(60, ttlSeconds);
ttlSeconds = Math.min(ttlSeconds, 86400);
```

PATCH 13 — Cache Stampede Protection (singleflight per key)

Location
- src/utils/cache.service.ts

Before

```ts
const freshData = await fetchFunction();
await this.set(key, freshData, ttl);
return freshData;
```

After

```ts
const g: any = globalThis as any;
if (!g.__cacheLocks) g.__cacheLocks = new Map<string, Promise<any>>();
let lock = g.__cacheLocks.get(key);
if (!lock) {
  lock = (async () => {
    const freshData = await fetchFunction();
    await this.set(key, freshData, ttl);
    return freshData;
  })().finally(() => {
    g.__cacheLocks.delete(key);
  });
  g.__cacheLocks.set(key, lock);
}
return await lock;
```

PATCH 14 — Academic Config Cache (activeYear & activeSemester)

Location
- src/modules/attendance/sesi-absensi/services/sesi.service.ts (tapSiswa)

Before

```ts
const activeYear = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
const activeSemester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: activeYear?.id || '' } });
```

After

```ts
const activeYear = await cacheService.getOrSet(
  CACHE_KEYS.ACADEMIC.TAHUN_PELAJARAN(tenantId),
  async () => prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
  300
);
const activeSemester = await cacheService.getOrSet(
  CACHE_KEYS.ACADEMIC.SEMESTER(tenantId),
  async () => prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: activeYear?.id || '' } }),
  300
);
```

PATCH 15 — Remove Duplicate Pre-Check Query (Gerbang Tap)

Location
- src/modules/attendance/gerbang/services/gerbang.service.ts

Before

```ts
const duplicateCheck = await this.checkDuplicateTap(...); // read DB per tap
if (duplicateCheck.isDuplicate) return duplicate response;
// lalu write/upsert
```

After

```ts
// tidak ada pre-check per tap
// insert-first; jika P2002 => fetch existing by unique key lalu return duplicate response
```
