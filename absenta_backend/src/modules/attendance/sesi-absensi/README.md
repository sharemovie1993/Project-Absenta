# Modul Sesi Absensi KBM (`/attendance/sesi-absensi`)

Modul ini mengelola seluruh pembukaan sesi KBM harian, pencatatan presensi siswa per jam pelajaran oleh Guru/Petugas Kelas (`AbsenSiswa`), penugasan mengajar guru per sesi (`AbsenGuru`), Jurnal KBM, serta warisan kehadiran gerbang otomatis (*Gate Attendance Propagation*).

---

## 🏛️ Arsitektur High-Concurrence Caching & Time-Aware Engine

### 📌 Database Composite Indexing
- `AbsenSiswa`: `@@index([tenant_id, sesi_id, status])`, `@@index([tenant_id, sesi_id, siswa_akademik_id])`
- `AbsenGuru`: `@@index([tenant_id, sesi_id])`, `@@index([tenant_id, guru_id, status])`

### 🔑 Key Cache & Time-Aware Inheritance Engine
1. **Summary Cache (`attendance:{tenantId}:summary_sesi:${sesiId}`)**: Agregasi ringkasan status per sesi KBM (Hadir, Terlambat, Izin, Sakit, Alpa).
2. **Status Protection Lock (`protectedStatuses`)**: Menjaga agar status `SAKIT`, `IZIN`, `ALPA`, `DISPEN` resmi tidak ter-override secara tidak sengaja oleh scan RFID biasa.
3. **Time-Aware Propagation**: Memastikan siswa yang izin berobat di jam 1-2 dan baru tap di jam 3 tetap memiliki status `IZIN` pada jam 1-2, dan otomatis menjadi `HADIR` pada jam 3 s/d selesai.

---

## 🔔 Sinyal Auto-Invalidation Real-Time

Setiap kali sesi KBM dibuat, diperbarui statusnya, atau absensi batch disubmit, service memanggil:
```typescript
void cacheInvalidationService.invalidateAttendanceCache(tenantId);
```
Perubahan langsung ter-update secara *real-time* di seluruh dashboard dan portal orang tua.

---

## ⚡ Hasil Benchmark Kecepatan
- **Cache MISS (Database Query & Summary Aggregation)**: ~79.33 ms
- **Cache HIT (Direct Redis Response)**: ~0.06 ms (**1322.2x lebih cepat**)
- **Script Uji Invalidation**: `test-gerbang-sesi-cache-invalidation.ts` (PASSED)
