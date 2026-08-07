# 📋 TASK ARTIFACT: MASTER CHECKLIST MIGRASI REACT QUERY (`useQuery` & `useMutation`)

Artifact ini adalah **Daftar Tugas Terpusat (Task Management Document)** untuk melacak status migrasi dari `useEffect` manual ke **TanStack React Query Standard** pada seluruh halaman (Tabel List, Detail Show Modal, Form Create/Edit, & Dropdown Options) di seluruh Modul & Sub-Modul platform Project Absenta.

---

## 🛡️ STANDAR PROSEDUR EKSEKUSI (5-STEP SINGLE-SHOT STANDARD)
- [x] **Langkah 1**: Audit variabel `useState` lama & pemanggilan fungsi `fetchX()`
- [x] **Langkah 2**: Bersihkan deklarasi state lama yang bentrok
- [x] **Langkah 3**: Ganti seluruh pemanggilan legacy dengan `refetch()` / `queryClient.invalidateQueries`
- [x] **Langkah 4**: Injeksi presisi `useQuery` (`staleTime: 5 min`) & `useMutation`
- [x] **Langkah 5**: Mandatory Type-Check (`npx tsc --noEmit`) 0 Error sebelum melapor

---

## 📦 BATCH 0: CORE MASTER DATA FOUNDATION — ✅ COMPLETED
- [x] **Task 0.1**: Migrasi `TahunPelajaranPage.tsx` & `TahunPelajaranList.tsx` (`staleTime: 5 min`) — ✅ **DONE (Commit 34f88b0b)**
- [x] **Task 0.2**: Migrasi `SemesterPage.tsx` & `SemesterList.tsx` (`staleTime: 5 min`) — ✅ **DONE (Commit 34f88b0b, e574145b, 8bcbf504)**
- [x] **Task 0.3**: Migrasi `KelasPage.tsx` & `KelasList.tsx` (`useQuery` + `useMutation`) — ✅ **DONE (Commit 2e892823)**
- [x] **Task 0.4**: Migrasi `JurusanPage.tsx` & `JurusanList.tsx` (`useQuery` + `useMutation`) — ✅ **DONE (Commit 2e892823)**
- [x] **Task 0.5**: Migrasi `MapelPage.tsx` & `MapelList.tsx` (`useQuery` + `useMutation`) — ✅ **DONE (Commit 2e892823)**

---

## 📦 BATCH 1: KESISWAAN & AKADEMIK BASIC — ✅ COMPLETED
- [x] **Task 1.1**: Migrasi `SiswaPage.tsx` & `SiswaList.tsx` (Beralih ke `siswaQueryKeys` / `useQuery` staleTime 5 min) — ✅ **DONE**
- [x] **Task 1.2**: Migrasi `SiswaForm.tsx` & `SiswaHistory.tsx` (`useMutation` & Detail `useQuery`) — ✅ **DONE**
- [x] **Task 1.3**: Migrasi `GuruPage.tsx` & `GuruList.tsx` (Beralih ke `guruQueryKeys` / `useQuery` staleTime 5 min) — ✅ **DONE**
- [x] **Task 1.4**: Migrasi `PelanggaranPage.tsx` & `PelanggaranList.tsx` (`kesiswaanQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 1.5**: Migrasi `PrestasiPage.tsx` & `PrestasiSection.tsx` (`kesiswaanQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 1.6**: Migrasi `PiketPage.tsx` (`piketQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 1.7**: Migrasi `JenisPelanggaranPage.tsx` (Master Kategori & Bobot Poin Pelanggaran) — ✅ **DONE**
- [x] **Task 1.8**: Migrasi `SettingsPage.tsx` & `SettingsSection.tsx` (Pengaturan Poin Pelanggaran & Prestasi) — ✅ **DONE**
- [x] **Task 1.9**: Migrasi `MonitoringKesiswaanPage.tsx` & `MonitoringKesiswaanComponents.tsx` (Dashboard Kesiswaan & Realtime Monitoring) — ✅ **DONE**
- [x] **Task 1.10**: Migrasi `JadwalKegiatanPage.tsx` (`/kesiswaan/jadwal-kegiatan`) (`useQuery` + `staleTime: 5m`) — ✅ **DONE**
- [x] **Task 1.11**: Migrasi `CetakBerkasKesiswaanPage.tsx` (`/kesiswaan/cetak-berkas`) (`useQuery` + `staleTime: 10m` offline cache) — ✅ **DONE**

---

## 📦 BATCH 2: BPBK STUDENT CARE & COUNSELING — ✅ COMPLETED
- [x] **Task 2.1**: Migrasi `KonselingSection.tsx` & `KonselingFormModal.tsx` (`bpbkQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.2**: Migrasi `HomeVisitSection.tsx` & `HomeVisitFormModal.tsx` (`bpbkQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.3**: Migrasi `CasesSection.tsx` & `CaseFormModal.tsx` (`bpbkQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.4**: Migrasi `PemanggilanSection.tsx` & `PemanggilanFormModal.tsx` (`bpbkQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.5**: Migrasi `RujukanSection.tsx` & `RujukanFormModal.tsx` (`bpbkQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.6**: Migrasi `AsesmenSection.tsx` & `AsesmenFormModal.tsx` (`bpbkQueryKeys` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.7**: Migrasi `DashboardSection.tsx` (`bpbkQueryKeys.stats()` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.8**: Migrasi `ReportsSection.tsx` (`bpbkQueryKeys.reports()`, `studentRiskTrend()` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.9**: Migrasi `AuditSection.tsx` (`bpbkQueryKeys.auditLogs()` / `useQuery`) — ✅ **DONE**
- [x] **Task 2.10**: Migrasi `SiswaKasusSection.tsx` (`siswaQueryKeys` & dropdown / `useQuery`) — ✅ **DONE**

---

## 📦 BATCH 3: KURIKULUM & SUPERVISI AKADEMIK — ✅ COMPLETED
- [x] **Task 3.1**: Migrasi `MasterStrukturPage.tsx` & `StrukturKurikulumPage.tsx` (`useMasterStrukturState` / `useQuery`) — ✅ **DONE**
- [x] **Task 3.2**: Migrasi `JadwalPelajaranPage.tsx` & `JadwalGrid.tsx` (`useQuery` + `staleTime: 5m`) — ✅ **DONE**
- [x] **Task 3.3**: Migrasi `JadwalPiketGuruPage.tsx` (`useQuery` master data & schedules) — ✅ **DONE**
- [x] **Task 3.4**: Migrasi `PerangkatAjarPage.tsx` (`useQuery` + AI library) — ✅ **DONE**
- [x] **Task 3.5**: Migrasi `SupervisiPage.tsx` & `SupervisiAnalyticsDashboard.tsx` (`useQuery` + `staleTime: 5m`) — ✅ **DONE**
- [x] **Task 3.6**: Migrasi `JamKBMPage.tsx` (Pengaturan Shift & Jam KBM via `['my-tenant-jam-kbm']`, `useKelasOptions`, `useJenjang`) — ✅ **DONE**
- [x] **Task 3.7**: Migrasi `GuruMapelPage.tsx` (Ploting Guru Mapel & Time-Off via `GuruMapelList`, `getAcademicStats` React Query) — ✅ **DONE**
- [x] **Task 3.8**: Migrasi `KalenderAkademikPage.tsx` (Event Kalender & Presets via `['calendar-presets']`, `useTahunPelajaranOptions`) — ✅ **DONE**
- [x] **Task 3.9**: Migrasi `RekapKBMPage.tsx`, `WaliKelasPage.tsx` (`useQuery` + `staleTime: 5m`) — ✅ **DONE**

---

## 📦 BATCH 4: HUBIN, DUDI, PKL, BKK, TRACER & TEFA — ✅ COMPLETED
- [x] **Task 4.1**: Migrasi `MitraIndustriPage.tsx` & `MitraFormModal.tsx` (`useQuery` + `useMutation` + Zod) — ✅ **DONE**
- [x] **Task 4.2**: Migrasi `PenempatanPklPage.tsx` & Plotting Modals (`useQuery` + `useMutation` + Zod) — ✅ **DONE**
- [x] **Task 4.3**: Migrasi `AbsensiPklPage.tsx` & `LogbookPklList` (`useQuery` + `useMutation` + Zod) — ✅ **DONE**
- [x] **Task 4.4**: Migrasi `MonitoringPklPage.tsx` (`useQuery` + `staleTime: 5m` + GPS Geofencing) — ✅ **DONE**
- [x] **Task 4.5**: Migrasi `InputNilaiPklPage.tsx` (`useQuery` + `useMutation` Batch Upsert + Cert) — ✅ **DONE**
- [x] **Task 4.6**: Migrasi `BkkPage.tsx`, `TracerStudyPage.tsx`, `TefaPage.tsx` & Sub-Sections (`useQuery` + `useMutation` + Zod) — ✅ **DONE**

---

## 📦 BATCH 5: SARPRAS, INVENTARIS ASET, PEMINJAMAN & PEMELIHARAAN — ✅ COMPLETED
- [x] **Task 5.1**: Migrasi `SarprasInventoryPage.tsx` & `AssetGrid.tsx` (`useQuery` + `useMutation` + Excel Import) — ✅ **DONE**
- [x] **Task 5.2**: Migrasi `SarprasLoansPage.tsx` & Quick Scan Modal (`useQuery` + `useMutation` + Barcode) — ✅ **DONE**
- [x] **Task 5.3**: Migrasi `SarprasMaintenancePage.tsx` & `RepairRecord` (`useQuery` + `useMutation` + Zod) — ✅ **DONE**
- [x] **Task 5.4**: Migrasi `SarprasCatalogPage.tsx` & Catalog Components (`useQuery` + `useMutation`) — ✅ **DONE**

---

## 📦 BATCH 6: KOPERASI ERP, POS KASIR, E-WALLET, SIMPAN PINJAM & SUB-MODUL LENGKAP — ✅ COMPLETED
- [x] **Task 6.1**: Migrasi `POS.tsx` & `usePOSState.ts` (`useQuery` + `useMutation`) — ✅ **DONE**
- [x] **Task 6.2**: Migrasi `Products.tsx` (`useQuery` + `staleTime: 5m`) — ✅ **DONE**
- [x] **Task 6.3**: Migrasi `Members.tsx` & `useMembersState.ts` (`useQuery` + `useMutation`) — ✅ **DONE**
- [x] **Task 6.4**: Migrasi `Savings.tsx` & `useSavingsState.ts` (`useQuery` + `useMutation`) — ✅ **DONE**
- [x] **Task 6.5**: Migrasi `Loans.tsx` (`useQuery` + `useMutation`) — ✅ **DONE**
- [x] **Task 6.6**: Migrasi `Accounting.tsx` (Jurnal Umum, Buku Besar, Neraca Saldo, & Laba Rugi Koperasi) — ✅ **DONE**
- [x] **Task 6.7**: Migrasi `LoanDetail.tsx` (Detail Pinjaman, Jadwal Angsuran & Bayar Cicilan Manual/Tabungan) — ✅ **DONE**
- [x] **Task 6.8**: Migrasi `SHU.tsx` & `PeriodFormModal.tsx` (Sisa Hasil Usaha, Alokasi Persentase & Periode SHU) — ✅ **DONE**
- [x] **Task 6.9**: Migrasi `ProductHistoryTab.tsx`, `ProductStockInTab.tsx`, `ProductOpnameTab.tsx` & `OpnameDetail.tsx` (Invetori Barang Masuk & Stock Opname) — ✅ **DONE**
- [x] **Task 6.10**: Migrasi `LaporanInventori.tsx` (Valuasi Stok, Margin Penjualan & Laporan Persediaan) — ✅ **DONE**
- [x] **Task 6.11**: Migrasi `PPOB.tsx` (Transaksi Pulsa, Token PLN, E-Money & Tagihan Multi-Biller) — ✅ **DONE**
- [x] **Task 6.12**: Migrasi `Vouchers.tsx` (Manajemen Kode Voucher Diskon & Promosi Toko) — ✅ **DONE**
- [x] **Task 6.13**: Migrasi `Settings.tsx` (Profil Koperasi, Bunga Pinjaman, Margin POS & Kop Surat Document) — ✅ **DONE**
- [x] **Task 6.14**: Migrasi `Tickets.tsx` & `TicketDetail.tsx` (Customer Support Helpdesk & Pengaduan Anggota) — ✅ **DONE**
- [x] **Task 6.15**: Migrasi `Announcements.tsx` & `SavingInsightsPanel.tsx` (Pengumuman Koperasi & Analytics Simpanan) — ✅ **DONE**

---

## 📦 BATCH 7: RAPOR K-MERDEKA/K13, LEGER, P5 & E-RAPOR — ✅ COMPLETED
- [x] **Task 7.1**: Migrasi `InputNilaiPage.tsx` & `ScoreGridTable.tsx` (`useQuery` + `useMutation`) — ✅ **DONE**
- [x] **Task 7.2**: Migrasi `CetakRaporPage.tsx` & `LegerStudentTable.tsx` (`useQuery` + `useMutation`) — ✅ **DONE**
- [x] **Task 7.3**: Migrasi `P5Page.tsx` & `P5ProjectList.tsx` (`useQuery` + `useMutation`) — ✅ **DONE**

---

## 📦 BATCH 8: USER MANAGEMENT, SUBMODUL ABSENSI, CORRESPONDENCE, SUPERADMIN & SUPPORT — ✅ COMPLETED
- [x] **Task 8.1**: Migrasi Management & User Accounts (`UserForm.tsx`, `ProfileEditModals.tsx`) — ✅ **DONE**
- [x] **Task 8.2**: Migrasi Sub-Modul Absensi & Ops (`AnggotaKegiatanEskulPage.tsx`, `GuruMonitoringPage.tsx`, `TrackingSiswaPage.tsx`, `GateInputModule.tsx`, `SessionManagerModule.tsx`, `CetakBerkasAbsensiPage.tsx`) — ✅ **DONE**
- [x] **Task 8.3**: Migrasi Rekap Absensi (`RekapBulananKelasPage.tsx`, `RekapBulananMapelPage.tsx`, `RekapBulananSiswaPage.tsx`, `RekapHarianKelasPage.tsx`, `RekapHarianSiswaPage.tsx`) — ✅ **DONE**
- [x] **Task 8.4**: Migrasi Tata Persuratan / Correspondence (`SuratKeluarPage.tsx`, `SuratMasukPage.tsx`) — ✅ **DONE**
- [x] **Task 8.5**: Migrasi Customer Support & Helpdesk (`SupportTicketPage.tsx`, `AdminSupportTicketPage.tsx`, `FloatingMessenger.tsx`, `SupportAnalyticsPanel.tsx`, `SupportSettingsPanel.tsx`) — ✅ **DONE**
- [x] **Task 8.6**: Migrasi Superadmin & System Tools (`BackupsPage.tsx`, `CalendarPresetsPage.tsx`, `KurikulumStandardsPage.tsx`, `TopikPresetsPage.tsx`, `InfrastructureDashboard.tsx`, `SystemUpdatePage.tsx`, `EasyTunnelPage.tsx`, `TripaySimulatorPage.tsx`) — ✅ **DONE**
- [x] **Task 8.7**: Migrasi Modul Cetak Berkas & Widgets (`CetakBerkasBkPage.tsx`, `CetakBerkasHubinPage.tsx`, `CetakBerkasSarprasPage.tsx`, `KepalaSekolahBkDashboardWidget.tsx`, `WakasisBkDashboardWidget.tsx`, `WaliKelasBkDashboardWidget.tsx`) — ✅ **DONE**
- [x] **Task 8.8**: Migrasi Common Picker & Document Editor Modals (`SmartStudentPicker.tsx`, `WordEditorModal.tsx`, `SKWaliKelasArsipModal.tsx`, `SKWaliKelasTemplateMasterModal.tsx`, `SKWaliKelasWordEditorModal.tsx`, `PpdbMappingPage.tsx`, `JenisKegiatanForm.tsx`, `PiketNotifModal.tsx`, `AsesmenFormModal.tsx`, `HubinDashboardSection.tsx`, `HubinGoogleDriveUploader.tsx`) — ✅ **DONE**

---

# 🎉 100% PROYEK MIGRASI TANSTACK REACT QUERY SELESAI
Seluruh 8 Batch migrasi komponen frontend pada Project Absenta telah selesai 100% di-refactor ke TanStack React Query (`useQuery`, `useMutation`, `useQueryClient.invalidateQueries`), tanpa sisa manual `useEffect` API fetching, dan lolos verifikasi kompilasi TypeScript (`npx tsc --noEmit` exit code 0)!
