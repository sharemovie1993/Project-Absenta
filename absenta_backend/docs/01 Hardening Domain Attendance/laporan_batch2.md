BATCH 2 — Hardening Fixes (Patch6–Patch10)

Tanggal: 2026-03-11

PATCH 6 — Realtime Event Backpressure Protection (Throttle 500ms/tenant)

Location
- src/modules/attendance/gerbang/controllers/gerbang.controller.ts

Before

```ts
void (async () => {
  // publish + socket fan-out + rebuild feed
})();
```

After (throttle 500ms/tenant)

```ts
const g: any = globalThis as any;
if (!g.__realtimeThrottle) g.__realtimeThrottle = new Map<string, number>();
const tKey = String(tenantId);
const now = Date.now();
const last = Number(g.__realtimeThrottle.get(tKey) || 0);
if (now - last > 500) {
  g.__realtimeThrottle.set(tKey, now);
  setImmediate(() => {
    void (async () => {
      // publish + socket fan-out + rebuild feed
    })();
  });
}
```

Penjelasan
- Maksimal 1 fan-out tiap 500ms per tenant untuk mencegah CPU spike saat burst.

PATCH 7 — Timezone Safe Gate Cache Key

Location
- gerbang.service.ts (markGatePresent)
- sesi.service.ts (dayIso untuk key)

Ringkasan
- Key Redis gate_present memakai tanggal yang dihitung dengan timezone tenant (offset Asia/Jakarta/Makassar/Jayapura), bukan UTC server.
- TTL dihitung sampai end-of-day zona tenant.

PATCH 8 — Strict Redis Cache Value

Location
- src/modules/attendance/sesi-absensi/services/sesi.service.ts

Before

```ts
const val = await redis.get(key);
if (val) gateTap = { id: 'cache' };
```

After

```ts
const val = await redis.get(key);
if (val === '1') gateTap = { id: 'cache' };
```

PATCH 9 — Safe TTL Gate Cache

Location
- src/modules/attendance/gerbang/services/gerbang.service.ts (markGatePresent)

Before

```ts
const ttlSeconds = Math.floor((endOfDay - Date.now()) / 1000);
```

After

```ts
let ttlSeconds = Math.max(60, Math.floor((endOfDay.getTime() - Date.now()) / 1000));
await redis.set(key, '1', 'EX', ttlSeconds);
```

Penjelasan
- TTL minimal 60 detik, maksimal end-of-day (tenant timezone).

PATCH 10 — Redis Failure Safe Mode

Location
- gerbang.service.ts (set gate_present)
- sesi.service.ts (get gate_present)

Before
- Tidak seluruh operasi dibungkus try/catch.

After

```ts
try {
  await redis.set(key, '1', 'EX', ttlSeconds);
} catch {}

try {
  const val = await redis.get(key);
  if (val === '1') gateTap = { id: 'cache' };
} catch {}
```

Penjelasan
- Jika Redis down/restart, jalur validasi tetap fallback ke DB (tidak mengubah behaviour).

