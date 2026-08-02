# 📑 Implementasi – Domain Jadwal KBM & Guru Mapel Full-Stack Cache Invalidation

## 📌 Ringkasan Implementasi
Dokumen ini mencatat penerapan arsitektur Dual-Layer Cache Invalidation untuk **Domain 3: Jadwal KBM & Plotting Guru Mapel**, mencakup penugasan guru pengampu mapel, alokasi slot jadwal pelajaran KBM, dan sinkronisasi cron job.

---

## 🔍 1. Backend Multi-Channel Audit & Invalidation (`guru-mapel.service.ts` & `jadwal-kbm.service.ts`)
- **Services**:
  - `GuruMapelService` (`absenta_backend/src/modules/kurikulum/guru-mapel/services/guru-mapel.service.ts`)
  - `JadwalKBMService` (`absenta_backend/src/modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service.ts`)
- **Method Invalidation**:
  - `cacheInvalidationService.invalidateBebanGuruCache(tenantId)`
  - `cacheInvalidationService.invalidateJadwalKbmCache(tenantId)`
- **Pintu Mutasi Tercover**:
  1. `assignMapelToGuru`: Plotting pengampu mapel (Global / Jurusan / Kelas).
  2. `removeAssignment`: Hapus plotting pengampu mapel.
  3. `createJadwalKBM`: Pembuatan slot jadwal KBM per kelas & hari.
  4. `updateJadwalKBM`: Perubahan slot jam, guru, atau mata pelajaran.
  5. `syncJadwalPelajaranCron`: Sinkronisasi otomatis semester & jadwal aktif.

---

## ⚡ 2. Frontend Installation & React Query Invalidation
- **Komponen Target**:
  - `GuruMapelForm.tsx` (`absenta_frontend/src/components/academic/guru-mapel/GuruMapelForm.tsx`)
  - `GuruMapelList.tsx` (`absenta_frontend/src/components/academic/guru-mapel/GuruMapelList.tsx`)
  - `JadwalKBMForm.tsx` (`absenta_frontend/src/components/attendance/jadwal-kbm/JadwalKBMForm.tsx`)
- **Invalidated Query Keys**:
  - `['beban-guru-list']`
  - `['jadwal-kbm-grid']`
  - `['jadwal-guru-timeline']`

---

## 🧪 3. Pengujian Otomatis & Kompilasi (`verify_domain3_jadwal_invalidation.py`)
- **Automated Verification Script**: Passed 100% (5/5 checks passed).
- **TypeScript Strict Compile**: `npx tsc --noEmit` ➔ **0 Error** (Backend & Frontend).
- **Git Commit**: `7fd1035d` ter-push ke `origin/main`.
