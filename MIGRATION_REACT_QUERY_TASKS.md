# 📋 TASK ARTIFACT: MASTER CHECKLIST MIGRASI REACT QUERY (`useQuery` & `useMutation`)

Artifact ini adalah **Daftar Tugas Terpusat (Task Management Document)** untuk melacak status migrasi dari `useEffect` manual ke **TanStack React Query Standard** pada seluruh halaman (Tabel List, Detail Show Modal, Form Create/Edit, & Dropdown Options) di 20 Modul platform Project Absenta.

---

## 🛡️ STANDAR PROSEDUR EKSEKUSI (5-STEP SINGLE-SHOT STANDARD)
- [x] **Langkah 1**: Audit variabel `useState` lama & pemanggilan fungsi `fetchX()`
- [x] **Langkah 2**: Bersihkan deklarasi state lama yang bentrok
- [x] **Langkah 3**: Ganti seluruh pemanggilan legacy dengan `refetch()` / `queryClient.invalidateQueries`
- [x] **Langkah 4**: Injeksi presisi `useQuery` (`staleTime: 5 min`) & `useMutation`
- [x] **Langkah 5**: Mandatory Type-Check (`npx tsc --noEmit`) 0 Error sebelum melapor

---

## 📦 BATCH 0: CORE MASTER DATA FOUNDATION
- [x] **Task 0.1**: Migrasi `TahunPelajaranPage.tsx` & `TahunPelajaranList.tsx` (`staleTime: 5 min`) — ✅ **DONE (Commit 34f88b0b)**
- [x] **Task 0.2**: Migrasi `SemesterPage.tsx` & `SemesterList.tsx` (`staleTime: 5 min`) — ✅ **DONE (Commit 34f88b0b, e574145b, 8bcbf504)**
- [ ] **Task 0.3**: Migrasi `KelasPage.tsx` & `KelasList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 0.4**: Migrasi `JurusanPage.tsx` & `JurusanList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 0.5**: Migrasi `MapelPage.tsx` & `MapelList.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 1: KESISWAAN & AKADEMIK BASIC
- [ ] **Task 1.1**: Migrasi `SiswaPage.tsx` & `SiswaList.tsx` (Beralih ke `useSiswaList` / `useQuery` staleTime 5 min)
- [ ] **Task 1.2**: Migrasi `SiswaForm.tsx` & `SiswaHistory.tsx` (`useMutation` & Detail `useQuery`)
- [ ] **Task 1.3**: Migrasi `GuruPage.tsx` & `GuruList.tsx` (Beralih ke `useGuruList` / `useQuery`)
- [ ] **Task 1.4**: Migrasi `PelanggaranPage.tsx` & `PelanggaranList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 1.5**: Migrasi `PrestasiPage.tsx` & `PrestasiList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 1.6**: Migrasi `PiketPage.tsx` & `PiketHarianList.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 2: BPBK STUDENT CARE & COUNSELING
- [ ] **Task 2.1**: Migrasi `KonselingSection.tsx` & `KonselingFormModal.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 2.2**: Migrasi `HomeVisitSection.tsx` & `HomeVisitFormModal.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 2.3**: Migrasi `CasesSection.tsx` & `CaseFormModal.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 2.4**: Migrasi `PemanggilanSection.tsx` & `PemanggilanFormModal.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 2.5**: Migrasi `RujukanSection.tsx` & `RujukanFormModal.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 2.6**: Migrasi `AsesmenSection.tsx` & `AsesmenFormModal.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 3: KURIKULUM & SUPERVISI AKADEMIK
- [ ] **Task 3.1**: Migrasi `MasterStrukturPage.tsx` & `KurikulumTreeTable.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 3.2**: Migrasi `JadwalKBMList.tsx` & `JadwalSolverModal.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 3.3**: Migrasi `JadwalPiketGuruPage.tsx` & `PosDutyList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 3.4**: Migrasi `PerangkatAjarPage.tsx` & `PerangkatAjarList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 3.5**: Migrasi `SupervisiPage.tsx` & `SupervisiList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 3.6**: Migrasi `RekapKBMPage.tsx` & `RekapKBMList.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 4: HUBIN, DUDI, PKL, BKK, TRACER & TEFA
- [ ] **Task 4.1**: Migrasi `MitraIndustriPage.tsx` & `MitraIndustriList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 4.2**: Migrasi `PenempatanPklPage.tsx` & `PenempatanPklList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 4.3**: Migrasi `AbsensiPklPage.tsx` & `LogbookPklList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 4.4**: Migrasi `MonitoringPklPage.tsx` & `MonitoringPklList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 4.5**: Migrasi `InputNilaiPklPage.tsx` & `NilaiPklList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 4.6**: Migrasi `BkkPage.tsx`, `TracerStudyPage.tsx`, `TefaPage.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 5: SARPRAS, INVENTARIS ASET, PEMINJAMAN & PEMELIHARAAN
- [ ] **Task 5.1**: Migrasi `SarprasInventoryPage.tsx` & `AssetList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 5.2**: Migrasi `SarprasLoansPage.tsx` & `LoanList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 5.3**: Migrasi `SarprasMaintenancePage.tsx` & `RepairList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 5.4**: Migrasi `SarprasCatalogPage.tsx` & `CatalogList.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 6: KOPERASI ERP, POS KASIR, E-WALLET & SIMPAN PINJAM
- [ ] **Task 6.1**: Migrasi `POS.tsx` & `CartPanel.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 6.2**: Migrasi `Products.tsx` & `ProductList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 6.3**: Migrasi `Members.tsx` & `MemberList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 6.4**: Migrasi `Savings.tsx` & `SavingsList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 6.5**: Migrasi `Loans.tsx` & `KoperasiLoanList.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 7: RAPOR K-MERDEKA/K13, LEGER, P5 & E-RAPOR
- [ ] **Task 7.1**: Migrasi `InputNilaiPage.tsx` & `ScoreGridTable.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 7.2**: Migrasi `CetakRaporPage.tsx` & `LegerStudentTable.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 7.3**: Migrasi `P5Page.tsx` & `P5ProjectList.tsx` (`useQuery` + `useMutation`)

---

## 📦 BATCH 8: USER ACCOUNTS, RBAC ROLES, CAPABILITIES & SIDEBAR
- [ ] **Task 8.1**: Migrasi `UsersPage.tsx` / `UserManagementPage.tsx` & `UserList.tsx` (`useQuery` + `useMutation`)
- [ ] **Task 8.2**: Migrasi `StrukturOrganisasiPage.tsx` & `OrgTreeChart.tsx` (`useQuery` + `useMutation`)
