# Modul Piket Kesiswaan & Surat Izin Keluar (`/kesiswaan/piket`)

Modul ini mengelola pencatatan izin keluar siswa sementara saat KBM berlangsung, izin pulang awal, izin urusan jurusan, serta pencatatan siswa kembali ke area sekolah oleh Guru Piket (`IzinKeluarSiswa`).

---

## 🏛️ Arsitektur High-Concurrence Multi-Tenant Redis Caching & Indexing

### 📌 Database Composite Indexing
- `IzinKeluarSiswa`: `@@index([tenant_id, jam_keluar])`, `@@index([tenant_id, status])`, `@@index([siswa_akademik_id])`

### 🔑 Key Redis Multi-Tenant Cache & Invalidation
1. **Daily Piket Monitoring Cache (`kesiswaan:piket:${tenantId}:${date}`)**: Membungkus pencarian daftar siswa yang sedang izin keluar hari ini dengan Redis Cache (TTL 5 menit).
2. **Auto Invalidation Signal**: Ketika transaksi izin baru dibuat (`createIzin`), siswa kembali (`catatKembali`), atau pembatalan izin (`deleteIzin`), service otomatis memicu:
   ```typescript
   void cacheInvalidationService.invalidatePiketCache(tenantId);
   ```
   Metode ini membersihkan cache piket harian dan cache rekap presensi secara serentak.

---

## ⚡ Hasil Benchmark Kecepatan
- **Izin Harian Cache MISS (DB Query)**: ~62.32 ms
- **Izin Harian Cache HIT (Direct Redis Response)**: ~0.11 ms (**566.5x lebih cepat**)
- **Script Uji Invalidation**: `test-piket-cache-invalidation.ts` (PASSED)
