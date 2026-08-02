# 🏛️ MASTER IMPLEMENTATION PLAN: FULL-STACK MULTI-TENANT ENTERPRISE HARDENING (GOOGLE-GRADE STANDARD)

## 📌 Visi & Standar Arsitektur
Penerapan arsitektur **Dual-Layer Multi-Channel Cache Invalidation** (Backend Redis L2 Purge ➔ Frontend React Query L1 Purge) secara **100% menyeluruh** di seluruh modul platform Project Absenta tanpa terkecuali.

---

## 🚀 FASE STRATEGIS: MIGRASI TOTAL TO REACT QUERY (`useQuery` & `useMutation`)

Seluruh komponen Frontend di 20 Modul (Tabel List, Detail Modal Show, Edit/Create Form, & Dropdown Options) dimigrasi 100% dari `useEffect` manual ke **TanStack React Query Standard**:

### 🎯 Standar Pola Arsitektur Unifikasi Frontend:
1. **📋 Tabel & List View (READ)**: 
   - Wajib menggunakan `useQuery({ queryKey: [domain, params], queryFn: apiFn, staleTime: 5 * 60 * 1000 })` atau dedicated custom hook (`useSiswaList`, `useGuruList`, `usePelanggaranList`, dll).
   - Menjamin: Instant load 0ms dari RAM, auto deduplication, kebal guncangan jaringan / offline sejenak, zero blank screen.
2. **👁️ Detail View Modal (SHOW)**:
   - Wajib menggunakan `useQuery({ queryKey: [domain-detail, id], queryFn: () => getDetail(id), enabled: !!id && isOpen })`.
   - Menjamin: Instant preview 0ms, auto-hydration.
3. **✏️ Edit & Create Form (WRITE / MUTATION)**:
   - Wajib menggunakan `useMutation({ mutationFn: saveFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: [domain] }) })`.
   - Menjamin: Auto invalidation & instant table refresh.
4. **🔽 Dropdown Options**:
   - Wajib menggunakan 28 Dedicated Custom Hooks (`useKelasOptions`, `useSiswaOptions`, `useGuruOptions`, `useDudiOptions`, `useBpbkEwsOptions`, `useKoperasiProductOptions`, `useUserListOptions`, dll).

---

## 🗺️ MASTER MIGRATION ROADMAP (9 BATCHES / ALL MODULES)

- [ ] **Batch 0: Core Master Data Foundation** (`TahunPelajaranPage.tsx`, `SemesterPage.tsx`, `JurusanPage.tsx`, `KelasPage.tsx`, `MapelPage.tsx`)
- [ ] **Batch 1: Modul Kesiswaan & Akademik Basic** (`SiswaList.tsx`, `GuruPage.tsx`, `PelanggaranPage.tsx`, `PrestasiPage.tsx`, `PiketPage.tsx`)
- [ ] **Batch 2: Modul BPBK Student Care** (`KonselingSection.tsx`, `HomeVisitSection.tsx`, `CasesSection.tsx`, `PemanggilanSection.tsx`, `RujukanSection.tsx`, `AsesmenSection.tsx`)
- [ ] **Batch 3: Modul Kurikulum & Supervisi** (`MasterStrukturPage.tsx`, `JadwalKBMList.tsx`, `JadwalPiketGuruPage.tsx`, `PerangkatAjarPage.tsx`, `SupervisiPage.tsx`, `RekapKBMPage.tsx`)
- [ ] **Batch 4: Modul HUBIN & PKL** (`MitraIndustriPage.tsx`, `PenempatanPklPage.tsx`, `AbsensiPklPage.tsx`, `MonitoringPklPage.tsx`, `InputNilaiPklPage.tsx`, `BkkPage.tsx`, `TracerStudyPage.tsx`)
- [ ] **Batch 5: Modul SARPRAS & Inventaris** (`SarprasInventoryPage.tsx`, `SarprasLoansPage.tsx`, `SarprasMaintenancePage.tsx`, `SarprasCatalogPage.tsx`)
- [ ] **Batch 6: Modul KOPERASI ERP & POS** (`POS.tsx`, `Products.tsx`, `Members.tsx`, `Savings.tsx`, `Loans.tsx`)
- [ ] **Batch 7: Modul RAPOR & Evaluasi** (`InputNilaiPage.tsx`, `CetakRaporPage.tsx`, `P5Page.tsx`)
- [ ] **Batch 8: Modul USERS & RBAC** (`UsersPage.tsx`, `StrukturOrganisasiPage.tsx`)

---

## 🧪 Siklus 5-Langkah Single-Shot Refactoring Standard (Prosedur Anti-Error)
Untuk setiap file komponen yang dimigrasi dari `useEffect` ke `useQuery`, AI Agent **WAJIB mengeksekusi 5 langkah ketat** berikut agar tidak terjadi cascading error atau Babel identifier collisions:

1. 🔍 **Langkah 1 (Audit Variabel & Fungsi Legacy)**: Scan seluruh file untuk mencatat nama variabel `useState` lama (`loading`, `data`, `totalPages`, `totalItems`, `stats`) dan fungsi fetch lama (`fetchX()`) beserta seluruh lokasi pemanggilannya (handler tombol, toolbar, dan array dependensi `useCallback`/`useMemo`/`useEffect`).
2. 🧹 **Langkah 2 (Pembersihan State Bentrok)**: Hapus deklarasi `useState` lama yang namanya sama dengan `useQuery` return keys sebelum menginjeksi `useQuery`.
3. 🔄 **Langkah 3 (Penggantian Total Pemanggilan Legacy)**: Ganti SELURUH pemanggilan `fetchX()` di tombol, modal, dan array dependensi dengan `refetch()` atau `queryClient.invalidateQueries(...)`.
4. ⚡ **Langkah 4 (Injeksi Presisi `useQuery` & `useMutation`)**: Pasang `useQuery` dengan `staleTime: 5 * 60 * 1000` (5 Menit) dan `useMutation` untuk penulisan data.
5. 🧪 **Langkah 5 (Verifikasi Mandiri Sebelum Melapor)**: Jalankan `npx tsc --noEmit` di terminal secara mandiri untuk memastikan **0 Error Kompilasi** sebelum melaporkan hasil ke pengguna.

---

## 🏆 STATUS CAPAIAN (DOMAIN HARMONIZED - 100% COMPLETED)

- [x] **Domain 0: Siswa & Akademik Basic** (Commit `c0f40085`, `8fc06a55`)
- [x] **Domain 1: Guru & PTK** (Commit `1c3285b3`)
- [x] **Domain 2: Mata Pelajaran (Mapel)** (Commit `0458dccd`)
- [x] **Domain 3: Jadwal KBM & Guru Mapel** (Commit `7fd1035d`)
- [x] **Domain 4: Struktur Kurikulum** (Commit `17ffe120`)
- [x] **Domain 5: Presensi & Attendance Ops** (Commit `d4ececf6`)
- [x] **Domain 6: Pelanggaran Kesiswaan** (Commit `fa6d6f8e`)

---

## 🟢 FASE A: DATA REFERENSI & MASTER DATA FOUNDATION (Bottom-Up Root)

Modul-modul ini adalah **Akar Pohon Data (Tree Root)** yang dikonsumsi oleh seluruh modul transaksi platform.

### 1. 📅 Modul A1: Tahun Pelajaran & Semester Aktif
- **Backend Check**: `absenta_backend/src/modules/academic/tahun-pelajaran/` & `semester/`
  - Mutasi: Set Semester Aktif, Switch Tahun Ajaran, Edit Tanggal Periode.
  - Invalidation: `cacheInvalidationService.invalidateAcademicCache(tenantId)`.
- **Frontend Install**: `TahunPelajaranPage.tsx`, `SemesterPage.tsx`, `HeaderSemesterBadge.tsx`
  - Invalidate query keys: `['tahun-pelajaran-list']`, `['semester-aktif']`, `['academic-stats']`.
- **Verification**: Script test & `npx tsc --noEmit`.

---

### 2. 🏫 Modul A2: Rombel Kelas, Jurusan, Global Program Keahlian & Preset Konsentrasi
- **Backend Check**: `absenta_backend/src/modules/academic/kelas/`, `jurusan/`, `program-keahlian/`
  - Mutasi: Tambah/Edit Kelas, Batch Kenaikan Kelas, Wizard Massal Jurusan, Master Program Keahlian, Preset Kurikulum SMK.
  - Invalidation: `cacheInvalidationService.invalidateStrukturTree(tenantId)` & `invalidateAcademicCache(tenantId)`.
- **Frontend Install & Custom Hooks**: `useKelasOptions.ts`, `useJurusanOptions.ts`, `useProgramKeahlianOptions.ts`, `KelasList.tsx`, `JurusanList.tsx`, `PresetWizardModal.tsx`
  - Invalidate query keys: `['kelas-options-list']`, `['jurusan-options-list']`, `['program-keahlian-options-list']`, `['kurikulum-struktur']`, `['classmates-roster-list']`.
- **Verification**: Script test & `npx tsc --noEmit`.

---

### 3. ⚙️ Modul A3: Master Config Shift Jam & Dropdown Utility API ✅ DONE (Commit `5479b386`)
- **Backend Check**: `absenta_backend/src/modules/system-config/` & `jenis-kegiatan-master/`
  - Mutasi: Setting Shift Jam Pelajaran, Jenis Kegiatan Master, System Config.
  - Invalidation: `cacheInvalidationService.invalidateAttendanceCache(tenantId)` & `invalidateAcademicCache(tenantId)`.
- **Frontend Install**: `JenisKegiatanMasterPage.tsx`, `SettingsPage.tsx`, `TenantAttendanceForm.tsx`
  - Invalidate query keys: `['jenis-kegiatan-list']`, `['system-config']`, `['attendance-config']`, `['academic-stats']`.
- **Verification**: ✅ 5/5 PASSED. `npx tsc --noEmit` 0 Error.

---

### 4. 🛠️ Remediasi Gap Audit Ulang (Siswa, Guru, Mapel) ✅ DONE (Commit `a99b7090`)
- **P1 (Backend Siswa Command Handlers)**:
  - `import-from-rows.command.ts`: Added `cacheInvalidationService.invalidateSiswaCache(tenantId)`
  - `bulk-update-status.command.ts`: Added `cacheInvalidationService.invalidateSiswaCache(tenantId)`
  - `map-ppdb-students.command.ts`: Added `cacheInvalidationService.invalidateSiswaCache(tenantId)`
- **P2 (Frontend Siswa Components)**:
  - `SiswaList.tsx`: Wired up `invalidateSiswaCache` on delete, bulk delete, delete all, and bulk class update actions
  - `NisGenerateWizard.tsx`: Added `useQueryClient` & `invalidateQueries` after NIS generation
  - `CompleteSiswaExitModal.tsx`: Added `useQueryClient` & `invalidateQueries` after student exit
- **P3 (Frontend Guru Modals Check)**:
  - Audited `SKWaliKelasWordEditorModal.tsx` & `SKWaliKelasBulkGenerateModal.tsx` (Read-only document generators).
- **Verification**: ✅ 6/6 PASSED. `npx tsc --noEmit` 0 Error.

---

### 5. 🏛️ Modul A4: Wali Kelas (Proxy Struktur Organisasi) & Kalender Akademik ✅ DONE (Commit `c7123cd2`)
- **Arsitektur**: Wali Kelas adalah proxy penugasan dari `Struktur Organisasi` (`OrganizationalAssignment` dengan `Position.code = 'WALIKELAS'`).
- **Backend Check**: `absenta_backend/src/modules/kurikulum/controllers/kalender-akademik.controller.ts` & `wali-kelas.service.ts`
  - Mutasi: Assign/Nonaktifkan Wali Kelas, Create/Update/Delete Kalender Akademik & Preset Libur.
  - Invalidation: Call `cacheInvalidationService.invalidateAcademicCache(tenantId)` & `invalidateAttendanceCache(tenantId)` on Kalender mutations.
- **Frontend Install**: `WaliKelasList.tsx`, `WaliKelasForm.tsx`, `KalenderAkademikPage.tsx`
  - Invalidate query keys: `['wali-kelas-options-list']`, `['kurikulum-struktur']`, `['kalender-akademik']`, `['kalender-stats']`, `['attendance-config']`, `['academic-stats']`.
- **Verification**: ✅ 5/5 PASSED. `npx tsc --noEmit` 0 Error.

---

### 6. 📚 Modul A5: Struktur Kurikulum & Turunannya (Ploting Guru Mapel & Cetak Dokumen) ✅ DONE (Commit `30f98b2d`)
- **Arsitektur**: `StrukturKurikulum` mengontrol alokasi JP & kelompok mapel per tingkat/jurusan. Turunannya: Ploting Guru Mapel (`GuruMapel`), Beban Mengajar (`BebanGuru`), dan Cetak Dokumen/Perangkat Ajar.
- **Backend Check**: `absenta_backend/src/modules/kurikulum/services/struktur-kurikulum.service.ts` & `guru-mapel.service.ts`
  - Mutasi: Upsert/Delete Struktur Kurikulum, Ploting Guru Mapel & Impor Excel Ploting.
  - Invalidation: Added `cacheInvalidationService.invalidateBebanGuruCache(tenantId)` to `upsert` and `delete`.
- **Frontend Install**: `useMasterStrukturState.ts`, `MasterStrukturPage.tsx`, `StrukturKurikulumTable.tsx`, `BulkPlottingForm.tsx`
  - Invalidate query keys: `['kurikulum-struktur']`, `['beban-guru-list']`, `['bebanGuru']`, `['academic-stats']`, `['mapel-options-list']`.
- **Verification**: ✅ 3/3 PASSED. `npx tsc --noEmit` 0 Error.

---

### 7. ⏰ Modul A6: Pengaturan Jam KBM & Jadwal KBM (Solver, Builder, & Grid) ✅ DONE (Commit `5e7d6781`)
- **Arsitektur**: `JamKBM` (Shift Jam Operasional KBM) dan `JadwalKBM` (Ploting Slot Jadwal Pelajaran). Turunan: Auto-Schedule Solver, Manual Builder, Impor Excel Jadwal, & Purge Reset.
- **Backend Check**: `absenta_backend/src/modules/kurikulum/jadwal-kbm/controllers/jadwal-kbm.controller.ts`
  - Mutasi: Create/Update/Delete Jadwal, Reset `clearAll`, Impor Excel Jadwal, & Auto-Generate Apply.
  - Invalidation: Added `cacheInvalidationService.invalidateJadwalKbmCache(tenantId)` to `clearAll`, `importFromExcel`, and `autoGenerateApply`.
- **Frontend Install**: `AutoJadwalWizardModal.tsx`, `JadwalBuilder.tsx`, `JadwalKBMList.tsx`, `JamKBMShiftPanel.tsx`, `JamKBMPage.tsx`
  - Invalidate query keys: `['jadwal-kbm-grid']`, `['jadwal-guru-timeline']`, `['beban-guru-list']`, `['bebanGuru']`, `['attendance-config']`, `['academic-stats']`, `['tenant-profile']`.
- **Verification**: ✅ 4/4 PASSED. `npx tsc --noEmit` 0 Error.

---

### 8. 🛡️ Modul A7: Jadwal Piket Guru (Teacher Duty Roster & Pos Piket) ✅ DONE (Commit `efd959fb`)
- **Arsitektur**: `JadwalPiketGuru` (Penugasan Guru Piket per Pos/Hari/Slot). Turunan: Timeline Jadwal Piket Guru, WA Chatbot Piket, & Rekap Duty Monitoring.
- **Backend Check**: `absenta_backend/src/modules/kurikulum/jadwal-piket/services/jadwal-piket.service.ts`
  - Mutasi: `createJadwalPiket`, `bulkAssignJadwalPiket`, `updateJadwalPiket`, `deleteJadwalPiket`.
  - Invalidation: Added `cacheInvalidationService.invalidateJadwalKbmCache(tenantId)` to all 4 mutation methods.
- **Frontend Install**: `JadwalPiketGuruPage.tsx`
  - Invalidate query keys: `['jadwal-piket-list']`, `['jadwal-guru-timeline']`, `['beban-guru-list']`, `['bebanGuru']`, `['academic-stats']`.
- **Verification**: ✅ 2/2 PASSED. `npx tsc --noEmit` 0 Error.

---

### 9. 📜 Modul A8: Perangkat Ajar, Global Preset Topik, & Bank Template Platform ✅ DONE (Commit `2774a2ae`)
- **Arsitektur**: `PerangkatAjar` (ATP, Prota, Promes, Modul Ajar), `GlobalTopikPreset` (Preset Topik Platform), & `GlobalPerangkatAjarLibrary` (Bank Perangkat Ajar Global & Adopsi/Claim).
- **Backend Check**: `absenta_backend/src/modules/kurikulum/controllers/perangkat-ajar.controller.ts` & `services/perangkat-ajar.service.ts`
  - Mutasi: `uploadPerangkat`, `reviewPerangkat`, `deletePerangkat`, `bulkDeletePerangkat`, `createTopikPreset`, `updateTopikPreset`, `deleteTopikPreset`, `claimGlobalLibraryItem`, `createGlobalLibraryItem`, `updateGlobalLibraryItem`, `deleteGlobalLibraryItem`, `savePerangkatAjarEditor`.
  - Invalidation: Added `cacheInvalidationService.invalidateAcademicCache(tenantId)` to all mutation endpoints.
- **Frontend Install**: `PerangkatAjarPage.tsx`, `PerangkatAjarWizardModal.tsx`, `PerangkatAjarAIModal.tsx`, `PerangkatAjarWordEditorModal.tsx`, `PerangkatAjarLibraryModal.tsx`
  - Invalidate query keys: `['perangkat-ajar-list']`, `['perangkat-ajar-stats-all']`, `['global-topik-presets']`, `['global-perangkat-library']`, `['academic-stats']`.
- **Verification**: ✅ 4/4 PASSED. `npx tsc --noEmit` 0 Error.

---

### 10. 📊 Modul A9: Audit Realisasi JP Mengajar & Supervisi Akademik Guru ✅ DONE (Commit `80cb21ab` + `0c70aecf`)
- **Arsitektur**: `SupervisiGuru` (Penilaian Kinerja Pembelajaran Guru & Self-Assessment) & `RekapKBM` (Agregasi Rencana JP vs Realisasi Sesi Absensi KBM).
- **Backend Check**: `absenta_backend/src/modules/kurikulum/services/supervisi.service.ts` & `controllers/rekap-kbm.controller.ts`
  - Mutasi: `create`, `update`, `delete`, `submitSelfAssessment`, `verify`.
  - Invalidation: Added `cacheInvalidationService.invalidateAcademicCache(tenantId)` to all Supervisi mutations.
- **Frontend Install & UI Polish**: `SupervisiPage.tsx`, `SupervisiFormModal.tsx`, `SupervisiSelfAssessmentModal.tsx`, `RekapKBMPage.tsx`, `MonitoringKbmPage.tsx`
  - Refined UI Menu Titles: **"Monitoring Live KBM"** (Pantauan Sesi Realtime) & **"Audit Realisasi JP Mengajar"** (Laporan Jam Mengajar per Semester).
  - Invalidate query keys: `['supervisi-list']`, `['supervisi-analytics']`, `['supervisi-recommendations']`, `['rekap-kbm-guru']`, `['academic-stats']`.
- **Verification**: ✅ 4/4 PASSED. `npx tsc --noEmit` 0 Error.

---

### 11. 📜 Modul A10: RAPOR & EVALUASI AKADEMIK (Pengolahan Nilai K-Merdeka & K13, Leger, P5, & E-Rapor Cetak) ✅ DONE (Commit `bd5ce225`)
- **Arsitektur**: `RaporSiswa` (Rekapitulasi Nilai Akhir & Catatan Wali Kelas), `NilaiSiswa` (Nilai Formatif, Sumatif, PTS, & PAS), `P5Project` (Projek Penguatan Profil Pelajar Pancasila), `LegerNilai` (Leger Rekapitulasi Kelas), & `PdfRapor` (Generator PDF E-Rapor).
- **Sub-Modul & Agent Integrasi**:
  1. 📝 **Sub-Modul 1: Input Nilai Formatif, Sumatif, & Deskripsi CP/TP** (`InputNilaiPage.tsx` & `RaporService.upsertNilai`).
  2. 📊 **Sub-Modul 2: Leger Nilai & Peringkat Siswa Per Kelas** (`CetakRaporPage.tsx` & `LegerStudentTable.tsx`).
  3. 🌟 **Sub-Modul 3: Assessment Projek P5 Kurikulum Merdeka** (`P5Page.tsx` & `useP5ProjectOptions`).
  4. 🔒 **Sub-Modul 4: Progress Input Nilai Guru & Lock Nilai Semester** (`Dashboard.tsx` & `useRaporProgress`).
  5. 🖨️ **Sub-Modul 5: Cetak PDF E-Rapor & Transkrip Akademik** (`pdf-rapor.service.ts` & `TranskripModal.tsx`).
  6. 🤖 **Agent Notifikasi Ortu & Portal Siswa**: Publikasi E-Rapor semester langsung mengirimkan link aman & kartu hasil studi ke Aplikasi Orang Tua & WA Gateway.
- **Backend Invalidation**: Method `cacheInvalidationService.invalidateRaporCache(tenantId, kelasId)` mem-purge Redis cache `rapor:${tenantId}:*` & leger stats.
- **Frontend Invalidation**: Custom hooks `useRaporLeger`, `useRaporProgress`, & `useP5ProjectOptions`, serta query invalidations pada `InputNilaiPage.tsx`, `CetakRaporPage.tsx`, `P5Page.tsx`, & `Dashboard.tsx`.
- **Verification**: ✅ 6/6 PASSED. `npx tsc --noEmit` 0 Error.

---

## 🔵 FASE B: DOMAIN TRANSACTIONAL & OPERATIONAL (Domain-Centric)

Modul-modul ini adalah **Pusat Transaksi & Layanan Operational Utama** sekolah.

---

### 1. 🚨 Modul B1: BPBK Student Care, Konseling, Home Visit, & EWS Escalation ✅ DONE (Commit `a3bc67d8`)
- **Arsitektur**: `KonselingBp` (Konseling Individu, Kelompok, Karir), `BpbkHomeVisit` (Kunjungan Rumah & Berita Acara), `EwsEscalation` (Deteksi Dini & Eskalasi Kasus), `BpbkPemanggilan` (Surat Pemanggilan Orang Tua/Wali), `BpbkRujukan` (Alih Tangan Kasus / Psikolog), `BpbkAsesmen` (Asesmen Diagnostik BK & AKPD), & `BullyingReport` (Safety Net Perundungan).
- **Sub-Modul & Agent Integrasi**:
  1. 🗣️ **Sub-Modul 1: Konseling Individual, Kelompok, & Karir** (`KonselingPage.tsx` & `BpbkService.createKonseling/updateKonseling/deleteKonseling`).
  2. 🏡 **Sub-Modul 2: Kunjungan Rumah / Home Visit & Berita Acara** (`HomeVisitPage.tsx` & `BpbkService.createHomeVisit/updateHomeVisit`).
  3. ⚠️ **Sub-Modul 3: Deteksi Dini & Eskalasi Kasus EWS** (`CasesPage.tsx`, `SiswaKasusPage.tsx` & `BpbkService.escalateViolationToEws/updateEwsStatus`).
  4. ✉️ **Sub-Modul 4: Surat Pemanggilan Orang Tua & Alih Tangan Rujukan** (`PemanggilanPage.tsx`, `RujukanPage.tsx` & `BpbkService.createPemanggilan/createRujukan`).
  5. 📋 **Sub-Modul 5: Asesmen Diagnostik BK, AKPD, & Cetak Berkas BK** (`AsesmenPage.tsx`, `CetakBerkasBkPage.tsx` & `BpbkService.createAsesmen`).
  6. 🛡️ **Sub-Modul 6: Safety Net & Pelaporan Perundungan / Bullying** (`BullyingReportController`).
  7. 🤖 **Agent Integrasi EWS BPBK di Modul Lain**:
     - **Agent Eskalasi Poin Kedisiplinan (Kesiswaan -> BPBK)**: Otomatis me-trigger alert EWS BPBK saat akumulasi poin pelanggaran siswa mencapai ambang batas (25, 50, 75, 100 poin).
     - **Agent Trigger Presensi Alpa (Absensi -> BPBK)**: Alpa berturut-turut (3x alpa) mentrigger rekomendasi konseling & home visit di dashboard BPBK.
     - **Agent Notifikasi Ortu (Parent App & WA Gateway)**: Panggilan konseling & laporan home visit terhubung ke WA Ortu & Aplikasi Orang Tua.
- **Backend Invalidation**: Method `cacheInvalidationService.invalidateBpbkCache(tenantId, siswaId)` mem-purge Redis cache `bpbk:${tenantId}:*`, `bpbk:${tenantId}:ews:${siswaId}*`, & dashboard stats.
- **Frontend Invalidation**: Custom hooks `useBpbkKonselingOptions` & `useBpbkEwsOptions`, serta query invalidations pada `DashboardPage.tsx`, `KonselingPage.tsx`, `HomeVisitPage.tsx`, `CasesPage.tsx`, `PemanggilanPage.tsx`, `RujukanPage.tsx`, & `AsesmenPage.tsx`.
- **Verification**: ✅ 5/5 PASSED. `npx tsc --noEmit` 0 Error.

---

### 2. 🎒 Modul B2: Piket & Surat Izin Keluar Siswa (Gate Pass & Security Exit) ✅ DONE (Commit `49ff8e7c`)
- **Arsitektur**: `IzinKeluarSiswa` (Izin Meninggalkan Kelas/Sekolah & Gate Verification).
- **Backend Check**: `absenta_backend/src/modules/kesiswaan/piket/services/piket.service.ts` & `controllers/piket.controller.ts`
  - Mutasi: `createIzin`, `catatKembali`, `deleteIzin`.
  - Invalidation: Verified `cacheInvalidationService.invalidatePiketCache(tenantId)` purges `kesiswaan:piket:${tenantId}:*` and calls `invalidateAttendanceCache(tenantId)`.
- **Frontend Install**: `PiketPage.tsx`, `PiketOperations.tsx`, `PiketHistory.tsx`, `PiketSecurity.tsx`
  - Invalidate query keys: `['piket-harian-list']`, `['piket-harian']`, `['piket-range']`, `['attendance-sessions']`, `['kesiswaan-stats']`.
- **Verification**: ✅ 3/3 PASSED. `npx tsc --noEmit` 0 Error.

---

### 3. 🚨 Modul B3: Kasus Pelanggaran & Poin Kedisiplinan Siswa ✅ DONE (Commit `757b72fa`)
- **Arsitektur**: `PelanggaranSiswa` (Pencatatan Kasus, Poin Kedisiplinan, & Peringatan Dini EWS BPBK) & `JenisPelanggaran` (Master Poin & Kategori Pelanggaran).
- **Backend Check**: `absenta_backend/src/modules/kesiswaan/services/pelanggaran.service.ts` & `jenis-pelanggaran.service.ts`
  - Mutasi: `create`, `update`, `delete` (PelanggaranSiswa) & `createJenisPelanggaran`, `updateJenisPelanggaran`, `deleteJenisPelanggaran`.
  - Invalidation: Added `cacheInvalidationService.invalidatePelanggaranCache(tenantId, siswaId)` to all mutation methods in both services.
- **Frontend Install**: `PelanggaranPage.tsx`, `JenisPelanggaranPage.tsx`, `PelanggaranFormModal.tsx`
  - Invalidate query keys: `['pelanggaran-list']`, `['kesiswaan-monitoring-violations']`, `['jenis-pelanggaran-options-list']`, `['bpbk-ews-list']`, `['pelanggaran-analytics']`, `['academic-stats']`.
- **Verification**: ✅ 4/4 PASSED. `npx tsc --noEmit` 0 Error.

---

### 4. 🏆 Modul B4: Prestasi & Penghargaan Siswa (Student Awards & Achievements) ✅ DONE (Commit `5fcc2f6a` + `13fcc8ce`)
- **Arsitektur**: `PrestasiSiswa` (Pencatatan Prestasi & Poin Reward Siswa) & `JenisPrestasi` (Master Kategori & Bobot Poin Prestasi).
- **Backend Check**: `absenta_backend/src/modules/kesiswaan/services/prestasi.service.ts` & `controllers/prestasi.controller.ts`
  - Mutasi: `createJenisPrestasi`, `updateJenisPrestasi`, `deleteJenisPrestasi`, `createPrestasiSiswa`, `updatePrestasiSiswa`, `deletePrestasiSiswa`.
  - Invalidation: Added `cacheInvalidationService.invalidatePrestasiCache(tenantId, siswaId)` to all 6 mutation methods.
- **Frontend Install**: `PrestasiPage.tsx`, `PrestasiSection.tsx`
  - Invalidate query keys: `['prestasi-list']`, `['kesiswaan-stats']`, `['academic-stats']`, `['dashboard-overview']`.
- **Verification**: ✅ 2/2 PASSED. `npx tsc --noEmit` 0 Error.

---

### 5. 📅 Modul B5: Jadwal Kegiatan Kesiswaan & Ekstrakurikuler ✅ DONE (Commit `ff08cd84` + `10310d68`)
- **Arsitektur**: `JadwalKegiatan` (Penyelenggaraan Kegiatan Kesiswaan, Upacara, Upadate Hari, & Eskul) & `JenisKegiatanMaster`.
- **Backend Check**: `absenta_backend/src/modules/attendance/jadwal-kegiatan/services/jadwal-kegiatan.service.ts`
  - Mutasi: `create`, `update`, `delete`.
  - Invalidation: Added `cacheInvalidationService.invalidateAttendanceCache(scope.tenantId)` & `invalidatePelanggaranCache(scope.tenantId)`.
- **Frontend Install**: `JadwalKegiatanPage.tsx`, `JadwalKegiatanFormModal.tsx`
  - Invalidate query keys: `['jadwal-kegiatan-list']`, `['jenis-kegiatan-master']`, `['attendance-sessions']`, `['kesiswaan-stats']`.
- **Verification**: ✅ 2/2 PASSED. `npx tsc --noEmit` 0 Error.

---

### 6. ⚙️ Modul B6: Master Jenis Pelanggaran, Jenis Prestasi, & Pengaturan Bobot Poin ✅ DONE (Commit `98802b65`)
- **Arsitektur**: `JenisPelanggaran` & `JenisPrestasi` (Master Data Matriks Point Kedisiplinan & Penghargaan Siswa).
- **Backend Check**: `absenta_backend/src/modules/kesiswaan/services/jenis-pelanggaran.service.ts` & `prestasi.service.ts`
  - Mutasi: `createJenisPelanggaran`, `updateJenisPelanggaran`, `deleteJenisPelanggaran` & `createJenisPrestasi`, `updateJenisPrestasi`, `deleteJenisPrestasi`.
  - Invalidation: `cacheInvalidationService.invalidatePelanggaranCache(tenantId)` & `cacheInvalidationService.invalidatePrestasiCache(tenantId)`.
- **Frontend Install**: `JenisPelanggaranPage.tsx`, `SettingsPage.tsx`, `SettingsSection.tsx`
  - Invalidate query keys: `['jenis-pelanggaran-options-list']`, `['jenis-prestasi-list']`, `['kesiswaan-monitoring-violations']`, `['pelanggaran-analytics']`, `['prestasi-list']`, `['kesiswaan-stats']`.
- **Verification**: ✅ 3/3 PASSED. `npx tsc --noEmit` 0 Error.

---

### 7. 🏗️ Modul B7: SARPRAS (Sarana & Prasarana, Inventaris Aset, Peminjaman, & Agent Perbaikan Ruangan) ✅ DONE (Commit `9be24fba`)
- **Arsitektur**: `SarprasAsset` (Aset & Stok), `SarprasLocation` (Ruangan & Gedung), `SarprasLoan` (Sirkulasi Peminjaman), `SarprasAssetRepair` (Pemeliharaan & Laporan Kerusakan), & `SarprasGlobalCatalog` (Katalog Global).
- **Sub-Modul & Agent Integrasi**:
  1. 🏢 **Sub-Modul 1: Manajemen Inventaris Aset & Stok Opname** (`AssetService` & `SarprasInventoryPage.tsx`).
  2. 🔄 **Sub-Modul 2: Peminjaman & Pengembalian Aset** (`LoanService` & `SarprasLoansPage.tsx`).
  3. 🛠️ **Sub-Modul 3: Pemeliharaan, Laporan Kerusakan, & PubSub Realtime** (`RepairService` & `SarprasMaintenancePage.tsx`).
  4. 📋 **Sub-Modul 4: Katalog Global & Master Kategori/Lokasi** (`SarprasCatalogPage.tsx`).
  5. 🤖 **Agent Integrasi Laporan Kerusakan Ruangan KBM/Guru**: Pelaporan kerusakan fasilitas kelas dari Guru Mengajar & Piket langsung masuk ke antrean SARPRAS.
- **Backend Invalidation**: Method `cacheInvalidationService.invalidateSarprasCache(tenantId)` mempurge `sarpras:${tenantId}:*` & dashboard stats.
- **Frontend Invalidation**: Installed query invalidation across `SarprasInventoryPage.tsx`, `SarprasLoansPage.tsx`, `SarprasMaintenancePage.tsx`, & `SarprasCatalogPage.tsx`.
- **Verification**: ✅ 6/6 PASSED. `npx tsc --noEmit` 0 Error.

---

### 8. 🏭 Modul B8: HUBIN (Hubungan Industri, Manajemen Prakerin/PKL, BKK, Tracer Study, & TEFA) ✅ DONE (Commit `ffa1c729`)
- **Arsitektur**: `MitraIndustri` (DUDI / Mitra Industri), `PklPlacement` (Penempatan & Guru Pembimbing), `PklLogbook` (Logbook Harian & Geolocation Presence), `PklMonitoring` (Jurnal Monitoring Pembimbing), `PklNilai` (Sertifikat & Nilai DUDI), `BkkLowongan` & `BkkPelamar` (Bursa Kerja Khusus), `TracerStudy` (Alumni), & `TefaProject` (Teaching Factory).
- **Sub-Modul & Agent Integrasi**:
  1. 🏢 **Sub-Modul 1: Manajemen Mitra Industri / DUDI** (`MitraIndustriPage.tsx` & `HubinService.createMitra/updateMitra/deleteMitra`).
  2. 📍 **Sub-Modul 2: Penempatan PKL & Mapping Guru Pembimbing** (`PenempatanPklPage.tsx` & `HubinService.createPenempatan/updatePenempatan`).
  3. 📝 **Sub-Modul 3: Logbook Harian & Presensi Geolocation Siswa PKL** (`AbsensiPklPage.tsx` & `HubinService.catatLogbook/verifikasiLogbook`).
  4. 🚗 **Sub-Modul 4: Monitoring Kunjungan & Bimbingan Guru** (`MonitoringPklPage.tsx` & `HubinService.catatMonitoring`).
  5. 🎓 **Sub-Modul 5: Penilaian, Sertifikat, & Cetak Berkas PKL** (`InputNilaiPklPage.tsx`, `CetakBerkasHubinPage.tsx` & `HubinService.inputNilai/generateSertifikat`).
  6. 💼 **Sub-Modul 6: BKK (Bursa Kerja Khusus), Tracer Study, & TEFA** (`BkkPage.tsx`, `TracerStudyPage.tsx`, `TefaPage.tsx`).
  7. 🤖 **Agent Integrasi Siswa Mobile & Guru Pembimbing**: Auto-sync logbook harian dari Siswa App & WA Bot notifikasi ke DUDI / Guru Pembimbing.
- **Backend Invalidation**: Method `cacheInvalidationService.invalidateHubinCache(tenantId, siswaId)` mem-purge Redis cache `hubin:${tenantId}:*` & dashboard stats.
- **Frontend Invalidation**: Custom hooks `useDudiOptions` & `usePklPlacementOptions`, serta query invalidations pada `MitraIndustriPage.tsx`, `PenempatanPklPage.tsx`, `AbsensiPklPage.tsx`, `MonitoringPklPage.tsx`, & `InputNilaiPklPage.tsx`.
- **Verification**: ✅ 6/6 PASSED. `npx tsc --noEmit` 0 Error.

---

### 9. 🛒 Modul B9: KOPERASI ERP, POS Toko, RFID E-Wallet, & Pinjaman Anggota ✅ DONE (Commit `8017a8d0`)
- **Arsitektur**: `KoperasiProduct` (Produk Toko & Stok Opname), `KoperasiTransaction` (Point of Sale / POS Kasir), `EwalletAccount` & `EwalletTransaction` (Dompet Digital RFID Siswa/Guru), `KoperasiMember` & `KoperasiLoan` (Pinjaman Simpan Pinjam Anggota Koperasi).
- **Sub-Modul & Agent Integrasi**:
  1. 🏪 **Sub-Modul 1: Point of Sale (POS Kasir Toko & Barcode Scanner)** (`POS.tsx` & `TokoService.createTransaction`).
  2. 💳 **Sub-Modul 2: E-Wallet RFID & Top-Up Tap Card** (`EwalletService.topUp/payWithEwallet` & `useEwalletBalance`).
  3. 📦 **Sub-Modul 3: Manajemen Inventaris Produk Toko & Stock Opname** (`Products.tsx` & `TokoService.createProduct/updateStock`).
  4. 🏦 **Sub-Modul 4: Simpan Pinjam & Potongan Gaji/Saldo Anggota** (`Loans.tsx`, `Savings.tsx` & `LoanService.createLoan/payLoanInstallment`).
  5. 🤖 **Agent Integrasi Transaksi RFID & Notifikasi Ortu**: Pembelian canteen/toko via E-Wallet RFID otomatis mem-deduct saldo & mengirimkan struk digital ke WA Ortu.
- **Backend Invalidation**: Method `cacheInvalidationService.invalidateKoperasiCache(tenantId, memberId)` mem-purge Redis cache `koperasi:${tenantId}:*` & balance `ewallet:${tenantId}:*`.
- **Frontend Invalidation**: Custom hooks `useKoperasiProductOptions`, `useEwalletBalance`, & `useKoperasiMemberOptions`, serta query invalidations pada `POS.tsx`, `Products.tsx`, `Members.tsx`, `Savings.tsx`, & `Loans.tsx`.
- **Verification**: ✅ 6/6 PASSED. `npx tsc --noEmit` 0 Error.

---

### 10. 👤 Modul U1: USER Accounts, RBAC Roles, Capabilities, & Sidebar Navigation ✅ DONE (Commit `0642b4e8` + `09997dcd`)
- **Arsitektur**: `UserAccount` (Identitas & Autentikasi Pengguna), `RolePermission` (Pemetaan Peran & Hak Akses Capability), `UserCapability` (Izin Granular Menu/Fitur), `SidebarRendering` (Navigasi Menu Ter-Hardening).
- **Sub-Modul & Agent Integrasi**:
  1. 👤 **Sub-Modul 1: Manajemen Akun Pengguna & Profil Tenant** (`UserService.createUser/updateUser/resetPassword`).
  2. 🛡️ **Sub-Modul 2: RBAC Matrix & User Capabilities** (`AuthorizationService` & `useUserListOptions`).
  3. 📑 **Sub-Modul 3: Menu Sidebar Dynamic Rendering** (`sidebarRenderingService` & `user:sidebar:${userId}`).
- **Backend Invalidation**: Method `cacheInvalidationService.invalidateUserCache(tenantId, userId)` mem-purge Redis cache `user:${tenantId}:*`, `user:profile:${userId}`, `user:capabilities:${userId}`, dan `user:sidebar:${userId}`.
- **Frontend Invalidation**: Custom hook `useUserListOptions`, serta query invalidations `['users-options-list']`, `['user-profile']`, `['user-capabilities']`.
- **Verification**: ✅ 4/4 PASSED. `npx tsc --noEmit` 0 Error.
  - Invalidation: Invalidate Billing & Subscription entitlement cache.
- **Frontend Install**: `SubscriptionStatusBanner.tsx`, `InvoiceHistoryPage.tsx`
  - Invalidate query keys: `['tenant-billing-status']`, `['invoice-history-list']`.
- **Verification**: Script test & `npx tsc --noEmit`.
