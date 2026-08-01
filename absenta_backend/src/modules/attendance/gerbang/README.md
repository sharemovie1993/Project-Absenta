# Modul Absensi Gerbang (`/attendance/gerbang`)

Modul ini mengelola seluruh transaksi kedatangan dan kepulangan presensi di pintu gerbang sekolah (**Tap RFID, Barcode/QR Code Scanner, Face Recognition Liveness, dan Manual Tap**) untuk Siswa (`AbsenGerbangSiswa`) maupun Guru (`AbsenGerbangGuru`), serta terintegrasi langsung dengan Halaman Operasional Presensi (`/attendance/ops`).

---

## 🏛️ Arsitektur High-Concurrence Multi-Tenant Redis Caching & Indexing

### 📌 Database Composite Indexing
- `AbsenGerbangSiswa`: `@@index([tenant_id, sesi_gerbang_id, siswa_id, arah])`, `@@index([tenant_id, siswa_id, arah])`
- `AbsenGerbangGuru`: `@@index([tenant_id, sesi_gerbang_id, guru_id, arah])`, `@@index([tenant_id, guru_id, arah])`

### 🔑 Distributed Redis Idempotency Lock & Zero-Query Rule Cache
1. **Idempotency Lock (`absenta:tap_lock:${tenantId}:${sessionId}:${targetId}:${arah}`)**: Kunci Redis SETNX 5-detik yang mencegah duplikasi tap akibat kartu nempel ganda atau bounce QR scanner.
2. **Zero-Query Rule Cache (`attendance:{tenantId}:gate_rule_config`)**: Membungkus query toleransi keterlambatan tenant, tingkat kelas, dan event khusus dengan Redis Cache (TTL 5 menit). Latency pembacaan aturan dipangkas dari ~25ms menjadi **0,06ms**.
3. **Fast-Path Presence Flag (`absenta:gate_present:${tenantId}:${date}:${siswaId}`)**: Key penanda cepat di Redis yang mengizinkan pemrosesan sesi KBM jam 1 mengetahui kehadiran gerbang siswa/guru dalam waktu 0,01ms tanpa query PostgreSQL.

---

## 🔔 Sinyal Auto-Invalidation Real-Time

Setiap kali terjadi tap gerbang (Siswa/Guru) atau pencatatan status manual di `/attendance/ops`, service memanggil:
```typescript
await cacheInvalidationService.invalidateAttendanceCache(tenantId);
```
Metode ini secara serentak menghapus cache dashboard, rekap presensi, dan statistik monitoring guru.

---

## ⚡ Hasil Benchmark Kecepatan
- **Cache MISS (Database Lookup & Query Aturan)**: ~79.33 ms
- **Cache HIT (Direct Redis Zero-Query Response)**: ~0.06 ms (**1322.2x lebih cepat**)
- **Script Uji Invalidation**: `test-gerbang-sesi-cache-invalidation.ts` (PASSED)
