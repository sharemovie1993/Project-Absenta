# 16. Implementasi – Domain Kesiswaan Pelanggaran Hardening & Enterprise Caching Layer

## 📌 Deskripsi Ringkas
Dokumen ini mencatat secara sistematis pekerjaan hardening keamanan multi-tenant, optimasi indeks database PostgreSQL, serta integrasi lapisan Redis Caching sentral pada modul **Kasus Pelanggaran Siswa (`PelanggaranSiswa`)** pada ekosistem **Project Absenta**.

---

## 🏛️ 1. Hardening Multi-Tenant & Multi-Jenjang (Security & Boundary Enforcement)

### A. Strict Tenant Boundary Isolation
Setiap transaksi penambahan, pembaruan, dan penghapusan catatan pelanggaran siswa pada `PelanggaranService` diverifikasi secara ketat berbasis `tenant_id`:
- **`siswa.findFirst({ where: { id: data.siswa_id, tenant_id: tenantId } })`**: Memastikan `siswa_id` yang diinput benar-benar terdaftar pada instansi sekolah tenant yang bersangkutan.
- Injeksi foreign key lintas tenant di-block 100% pada tingkat service layer dan mengembalikan error HTTP 404 / 403.

### B. Otomatisasi Relasi Akademik (Multi-Jenjang)
Setiap record `PelanggaranSiswa` menyimpan pengikatan otomatis ke:
- `siswa_akademik_id`: Pengikatan ke rombel & semester siswa saat pelanggaran terjadi.
- `kelas_id`: Pengikatan langsung ke kelas binaan/rombel aktif.

---

## 🗄️ 2. Indeks Komposit Database PostgreSQL (Prisma Schema Hardening)

Untuk menjamin kecepatan query pada skala jutaan record (Multi-Tenant Enterprise), 3 indeks komposit performa tinggi telah ditambahkan ke skema Prisma (`PelanggaranSiswa`):

```prisma
model PelanggaranSiswa {
  id                String   @id @default(uuid())
  tenant_id         String
  siswa_id          String
  siswa_akademik_id String?
  kelas_id          String?
  tanggal           DateTime @db.Date
  jenis_pelanggaran String
  poin              Int      @default(0)
  status            String   @default("BARU")
  keterangan        String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@index([tenant_id])
  @@index([siswa_id])
  @@index([tanggal])
  @@index([tenant_id, status])
  @@index([tenant_id, created_at])
  @@index([tenant_id, kelas_id])          // ⚡ Query Cepat Filter Wali Kelas per Rombel
  @@index([tenant_id, kelas_id, tanggal]) // ⚡ Query Rentang Tanggal Presisi Rombel
  @@index([tenant_id, siswa_id, status])  // ⚡ Query EWS Risk Calculation BP/BK
}
```

---

## ⚡ 3. Integrasi Caching Sentral & Generator Kunci Cache (`CACHE_KEYS`)

### A. Generator Kunci Cache (`CACHE_KEYS.KESISWAAN`)
Mengadopsi standar `CACHE_KEYS` aplikasi di `src/constants/cache-keys.ts`:
```ts
KESISWAAN: {
  PIKET_HARIAN: (tenantId: string, date: string) => `kesiswaan:piket:${tenantId}:${date}`,
  PELANGGARAN_LIST: (tenantId: string, page: number = 1, limit: number = 10, search: string = '', kelasId?: string, status?: string) => 
    `kesiswaan:pelanggaran:${tenantId}:${page}:${limit}:${search || 'all'}:${kelasId || 'all'}:${status || 'all'}`,
  PELANGGARAN_ANALYTICS: (tenantId: string, year: number) => `kesiswaan:pelanggaran:${tenantId}:analytics:${year}`,
  PELANGGARAN_DETAIL: (tenantId: string, id: string) => `kesiswaan:pelanggaran:${tenantId}:detail:${id}`,
  ALL: (tenantId: string) => `kesiswaan:${tenantId}:*`
}
```

### B. Cache Read & Write Layer
- **`PelanggaranService.getAll`**: Memeriksa `cacheService.get(cacheKey)`. Jika `Cache HIT`, mengembalikan JSON instan (0ms overhead DB). Jika `Cache MISS`, mengambil data dari PostgreSQL dan menyimpannya via `cacheService.set(cacheKey, result, CACHE_TTL.DEFAULT)`.
- **`PelanggaranService.getAnalytics`**: Menggunakan TTL `CACHE_TTL.DASHBOARD` (300s).

### C. Unified Cache Invalidation (`CacheInvalidationService`)
Pada method `create`, `update`, dan `delete`, `PelanggaranService` memanggil:
```ts
await cacheInvalidationService.invalidatePelanggaranCache(tenantId, siswaId);
```
Yang secara otomatis menghapus pola kunci Redis:
1. `kesiswaan:pelanggaran:{tenantId}:*`
2. `kesiswaan:{tenantId}:*`
3. `bpbk:{tenantId}:ews:{siswaId}*`
4. `dashboard:overview:{tenantId}:*`

---

## 🚨 4. Real-Time EWS (Early Warning System) Alerting Integration
Apabila poin kumulatif pelanggaran siswa melewati ambang batas bahaya (`riskLevel === 'HIGH'`), sistem secara otomatis memicu sinyal notifikasi in-app real-time ke Guru BP/BK yang bertugas membina siswa tersebut.

---

## 📊 Status Verifikasi
- **PostgreSQL Migration**: `npx prisma db push` ➔ **Done (384ms, In Sync)**.
- **Backend Compilation**: `npx tsc --noEmit` ➔ **0 Error (PASS)**.
- **Git Commit**: `29f1b63d` & `76b3e5d9` ter-push ke `origin/main`.
