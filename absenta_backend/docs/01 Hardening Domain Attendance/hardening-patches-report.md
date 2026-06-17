Hardening Patches (Production) — Attendance Module

Tanggal: 2026-03-11

PATCH 1 — Tenant Isolation (Attendance Modules)

Files diubah

- [gerbang.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts)
- [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts)

Perubahan (Before/After)

1) SISWA lookup harus tenant-scoped

BEFORE

```ts
const siswaUser = await prisma.siswa.findFirst({ where: { user_id: userId } });
```

AFTER

```ts
const siswaUser = await prisma.siswa.findFirst({ where: { user_id: userId, tenant_id: String(tenantId) } });
```

2) Petugas lookup harus tenant-scoped

BEFORE

```ts
const isPetugas = await prisma.siswaStrukturOrganisasi.findFirst({
  where: { siswa_id: siswaUser.id, is_active: true, StrukturOrganisasi: { scope: 'attendance' } }
});
```

AFTER

```ts
const isPetugas = await prisma.siswaStrukturOrganisasi.findFirst({
  where: { tenant_id: String(tenantId), siswa_id: siswaUser.id, is_active: true, StrukturOrganisasi: { scope: 'attendance' } }
});
```

3) Endpoint prerequisites harus tenant-safe pada lookup AbsenGerbangSiswa

BEFORE

```ts
const gateTap = await prisma.absenGerbangSiswa.findFirst({
  where: { siswa_id: siswa_id, sesi_gerbang_id: gateSession.id, arah: 'GERBANG_DATANG' },
});
```

AFTER

```ts
const gateTap = await prisma.absenGerbangSiswa.findFirst({
  where: { tenant_id: tenantId, siswa_id: siswa_id, sesi_gerbang_id: gateSession.id, arah: 'GERBANG_DATANG' },
});
```

4) Lookup kelas di jalur gerbang (transaction) harus tenant-safe

BEFORE

```ts
await tx.kelas.findUnique({ where: { id: kelasId }, select: { tingkat: true, jam_masuk: true, jam_pulang: true } })
```

AFTER

```ts
await tx.kelas.findFirst({ where: { id: kelasId, tenant_id: tenantId }, select: { tingkat: true, jam_masuk: true, jam_pulang: true } })
```

PATCH 2 — Redis KEYS → SCAN (Cache deletePattern)

Files diubah

- [cache.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/utils/cache.service.ts#L126-L152)

Perubahan (Before/After)

BEFORE

```ts
const keys = await client.keys(pattern);
if (keys.length > 0) {
  await client.del(keys);
}
```

AFTER

```ts
const batch: string[] = [];
for await (const keys of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
  for (const key of keys) {
    batch.push(key);
    if (batch.length >= 500) {
      await client.del(batch);
      batch.length = 0;
    }
  }
}
if (batch.length > 0) {
  await client.del(batch);
}
```

Konfirmasi

- Tidak ada pemanggilan `client.keys(` yang tersisa di codebase backend.

PATCH 3 — Realtime Event Non-Blocking (Gerbang Critical Path)

Files diubah

- [gerbang.controller.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/controllers/gerbang.controller.ts#L218-L271)

Perubahan (Before/After)

BEFORE

```ts
await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
const sockets = await io.in(`tenant:${tenantId}`).fetchSockets();
await Promise.all(sockets.map(async (s) => {
  const feed = await buildAttendanceFeed(...);
  s.emit('attendance_feed_update', feed);
}));
```

AFTER

```ts
void (async () => {
  const redis = (await import('@/config/redis.config')).redisConfig.getClient();
  if (redis) {
    await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
  }
  const sockets = await io.in(`tenant:${tenantId}`).fetchSockets();
  await Promise.all(sockets.map(async (s) => {
    const feed = await buildAttendanceFeed(...);
    s.emit('attendance_feed_update', feed);
  }));
})().catch(() => {});
```

Konfirmasi

- Response API gerbang tidak lagi menunggu publish Redis / socket fan-out / feed rebuild karena semua dijalankan di async task terpisah.

PATCH 4 — Unique Sesi Gerbang

Files diubah

- [schema.prisma](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/schema.prisma#L1085-L1104)
- [migration.sql](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/migrations/20260311120000_unique_sesi_gerbang/migration.sql)

Perubahan schema (Before/After)

BEFORE

```prisma
model SesiGerbang {
  @@index([tenant_id])
  @@index([tenant_id, tanggal])
}
```

AFTER

```prisma
model SesiGerbang {
  @@unique([tenant_id, tanggal])
  @@index([tenant_id])
  @@index([tenant_id, tanggal])
}
```

Migration SQL (yang dihasilkan)

```sql
CREATE UNIQUE INDEX "SesiGerbang_tenant_id_tanggal_key" ON "SesiGerbang"("tenant_id", "tanggal");
```

Pre-check yang disarankan sebelum apply di production

```sql
SELECT "tenant_id", "tanggal", COUNT(*) AS cnt
FROM "SesiGerbang"
GROUP BY "tenant_id", "tanggal"
HAVING COUNT(*) > 1;
```

PATCH 5 — Redis Gate Presence Cache (gate_present)

Files diubah

- [gerbang.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/gerbang/services/gerbang.service.ts)
- [sesi.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/attendance/sesi-absensi/services/sesi.service.ts)

Format key Redis

- `gate_present:{tenant}:{date}:{siswa_id}`
- Contoh: `gate_present:tenant-123:2026-03-11:siswa-uuid`

TTL

- TTL diset sampai end-of-day (timezone tenant), minimal 60 detik:
  - dihitung dari `endOfDay - now` dalam detik.

Perubahan (Before/After)

1) Saat gerbang DATANG sukses, set flag

AFTER (contoh potongan)

```ts
if (input.arah === JenisTap.GERBANG_DATANG) {
  void this.markGatePresent(tenantId, input.siswa_id);
}
```

2) Saat tap sesi, cek Redis dulu; jika hit, skip query DB gerbang

BEFORE

```ts
const gateSession = await cacheService.getOrSet(...);
const gateTap = gateSession ? await prisma.absenGerbangSiswa.findFirst(...) : null;
if (!gateTap) throw new Error('Gate belum tercatat...');
```

AFTER

```ts
let gateTap: { id: string } | null = null;
try {
  const redis = getRedisConnection();
  const key = `gate_present:${tenantId}:${dayIso}:${siswa_id}`;
  const val = await redis.get(key);
  if (val) gateTap = { id: 'cache' };
} catch {}
if (!gateTap) {
  const gateSession = await cacheService.getOrSet(...);
  gateTap = gateSession ? await prisma.absenGerbangSiswa.findFirst(...) : null;
}
if (!gateTap) throw new Error('Gate belum tercatat...');
```

Verifikasi build

- Backend build (tsc) sukses setelah semua patch.

