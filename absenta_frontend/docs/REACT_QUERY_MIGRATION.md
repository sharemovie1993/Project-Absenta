# 🚀 DOKUMENTASI MIGRASI TANSTACK REACT QUERY — PROJECT ABSENTA

Dokumen ini mencatat kemajuan migrasi dari `useEffect` manual ke **TanStack React Query Standard** (`useQuery` & `useMutation`) di seluruh modul aplikasi `absenta_frontend`.

---

## 🛡️ Standar Implementasi (5-Step Single-Shot Standard)
1. **Audit**: Identifikasi `useState` data/loading/pagination & `useEffect` fetch.
2. **Cleanup**: Hapus deklarasi `useState` / `useEffect` yang terduplikasi.
3. **Query Key Factory**: Tambahkan `xQueryKeys` (e.g. `guruQueryKeys`, `siswaQueryKeys`) di API file.
4. **Inject `useQuery`**: Menggunakan `staleTime: 5 min` dan handle pagination & filter secara deklaratif.
5. **Mutation Invalidation**: Gunakan `queryClient.invalidateQueries` & `refetch()` di handler mutation.
6. **Mandatory Type-Check**: `npx tsc --noEmit` wajib PASS 0 Error.

---

## 📊 Status Migrasi Modul

### 📦 BATCH 0: Core Master Data Foundation — ✅ COMPLETED
- `TahunPelajaranPage.tsx` & `TahunPelajaranList.tsx` — ✅ COMPLETED
- `SemesterPage.tsx` & `SemesterList.tsx` — ✅ COMPLETED
- `KelasPage.tsx` & `KelasList.tsx` — ✅ COMPLETED
- `JurusanPage.tsx` & `JurusanList.tsx` — ✅ COMPLETED
- `MapelPage.tsx` & `MapelList.tsx` — ✅ COMPLETED

### 📦 BATCH 1: Kesiswaan & Akademik Basic — ✅ COMPLETED
- `GuruPage.tsx` & `GuruList.tsx` — ✅ COMPLETED (`guruQueryKeys`, `staleTime: 5m`)
- `SiswaPage.tsx` & `SiswaList.tsx` — ✅ COMPLETED (`siswaQueryKeys`, `staleTime: 5m`)
- `SiswaForm.tsx` & `SiswaHistory.tsx` — ✅ COMPLETED (`siswaQueryKeys`, `staleTime: 5m`)
- `PelanggaranPage.tsx` — ✅ COMPLETED (`kesiswaanQueryKeys`, `staleTime: 5m`)
- `PrestasiPage.tsx` & `PrestasiSection.tsx` — ✅ COMPLETED (`kesiswaanQueryKeys`, `staleTime: 5m`)
- `PiketPage.tsx` — ✅ COMPLETED (`piketQueryKeys`, `staleTime: 5m`)
- `JenisPelanggaranPage.tsx` — ✅ COMPLETED (`kesiswaanQueryKeys.jenisPelanggaran`, `staleTime: 10m`)
- `SettingsPage.tsx` & `SettingsSection.tsx` — ✅ COMPLETED (`kesiswaanQueryKeys.jenisPelanggaran/jenisPrestasi`, `staleTime: 10m`)
- `MonitoringKesiswaanPage.tsx` & `MonitoringKesiswaanComponents.tsx` — ✅ COMPLETED (`kesiswaan-monitoring-violations`, `piket-guru-hari-ini`, `kalender-akademik-upcoming`)
- `JadwalKegiatanPage.tsx` (`/kesiswaan/jadwal-kegiatan`) — ✅ COMPLETED (`jadwal-kegiatan-list`, `jenis-kegiatan-master-list`, `staleTime: 5m`)

---

## 📝 Catatan Audit Terbaru
- **Guru Module**: `GuruPage.tsx` memuat `academic-stats` via `useQuery`. `GuruList.tsx` mengelola list, debounced search, dan pagination via `useQuery(guruQueryKeys.list(...))`. All mutations (`deleteGuru`, `updateGuru`, `QuickEditCell`) menginvalidasi cache `guruQueryKeys.all` + `refetch()`.
- **Siswa Module**: `SiswaPage.tsx` memuat 5 parallel stats (`academic-stats`, `activeSiswaRes`, `calonRes`, `activeYear`, `activeSemester`, `regStats`) via `useQuery`. `SiswaList.tsx` mengelola 5000-records analysis & list pagination via `useQuery(siswaQueryKeys.list(...))`. Detail & riwayat (`SiswaForm.tsx`, `SiswaHistory.tsx`) menggunakan `useQuery` terintegrasi.
- **Kesiswaan (Pelanggaran & Prestasi)**: `PelanggaranPage.tsx` & `PrestasiSection.tsx` beralih dari `fetchData` manual ke `useQuery(kesiswaanQueryKeys.pelanggaranList/prestasiList(...))` dan invalidasi query key terpusat.
- **Meja Piket**: `PiketPage.tsx` memuat `guruPiketHariIni` dan `dailyPermits` via `useQuery(piketQueryKeys.dailyPermits())`.
