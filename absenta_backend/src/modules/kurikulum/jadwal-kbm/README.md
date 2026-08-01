# Modul Jadwal Pelajaran / KBM (`/kurikulum/jadwal-kbm`)

Modul ini mengelola penyusunan dan visualisasi jadwal pelajaran KBM sekolah, mencakup Master Grid Timetable Guru, Master Grid Timetable Kelas, Single Grid Kelas, Timeline Guru Hari Ini/Mingguan, serta impor dari aSC TimeTables (Excel).

---

## 🏛️ Arsitektur Multi-Tenant Redis Caching & Database Indexing

### 📌 Database Composite Indexing
Tabel `JadwalKBM` dilengkapi dengan composite index:
```prisma
@@index([tenant_id, tahun_pelajaran_id, semester_id, kelas_id])
```

### 🔑 Struktur Key Cache Redis (TTL 5 Menit)
- **Jadwal Grid Timetable**: `academic:{tenantId}:jadwal_grid:{kelasId}:{yearId}:{semId}`
- **Timeline Mengajar Guru**: `academic:{tenantId}:jadwal_guru:{guruId}:{day}`

---

## 🔔 Sinyal Auto-Invalidation Real-Time

Setiap kali ada pembuatan jadwal baru, update slot, hapus jadwal, atau impor massal dari Excel aSC TimeTables, service memanggil:
```typescript
await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);
```
Metode ini secara otomatis menghapus key `academic:{tenantId}:jadwal_grid:*` dan `academic:{tenantId}:jadwal_guru:*` di Redis.

---

## 🎨 Frontend Zero-Blocking Hash Map Rendering
- Komponen `MasterGridGuruTimetable.tsx`, `MasterGridKelasTimetable.tsx`, dan `JadwalGrid.tsx` menggunakan Memoized 2D Lookup Map (`guruSlotMap` & `kelasSlotMap`).
- Kompleksitas pencarian sel jadwal dipangkas dari $O(N)$ (7,7 juta operasi perulangan) menjadi **$O(1)$ Hash Map Lookup**.

---

## ⚡ Hasil Benchmark Kecepatan
- **Cache MISS (Database Fetch & Grid Build)**: ~86.93 ms
- **Cache HIT (Direct Redis Response)**: ~0.05 ms (**1738.6x lebih cepat**)
- **Script Uji Invalidation**: `test-jadwal-cache-invalidation.ts` (PASSED)
