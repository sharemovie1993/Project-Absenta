# Tugas Eksekusi Modul HUBIN

- [x] **Fase 1: Migrasi Skema Database**
    - [x] Tambahkan field baru (`pic_nama`, `pic_jabatan`, `pic_telepon`, `pic_email`, `mou_nomor`, `mou_tanggal_mulai`, `mou_tanggal_berakhir`, `mou_status`, `kuota_pkl`, `kompetensi_keahlian`) ke model `MitraIndustri` di `schema.prisma`.
    - [x] Buat model `HubinMoUHistory` di `schema.prisma`.
    - [x] Buat model `HubinLowongan` di `schema.prisma`.
    - [x] Buat model `HubinLamaran` di `schema.prisma`.
    - [x] Buat model `HubinTracerStudy` di `schema.prisma`.
    - [x] Buat model `HubinTefaOrder` di `schema.prisma`.
    - [x] Jalankan `npx prisma db push` di backend untuk menerapkan perubahan skema.
- [x] **Fase 2: Layanan & Kontroler Backend (API)**
    - [x] Perbarui `HubinService` untuk mendukung CRUD Mitra dengan field baru & MoU History.
    - [x] Tulis fungsi CRUD `HubinLowongan` dan `HubinLamaran` di `HubinService`.
    - [x] Tulis fungsi CRUD `HubinTracerStudy` di `HubinService`.
    - [x] Tulis fungsi CRUD `HubinTefaOrder` di `HubinService`.
    - [x] Backend: Daftarkan restore koneksi WhatsApp di `main.ts`
    - [x] Backend: Tambahkan handler koneksi local di `whatsapp.controller.ts`.
    - [x] Perbarui `getHubinStats` di `dashboard.service.ts` agar menyertakan metrik MoU kadaluarsa, lowongan BKK aktif, tracer study alumni, dan serapan kerja.
- [x] **Fase 3: Frontend API Client**
    - [x] Perbarui `hubin.api.ts` dengan mendefinisikan interface baru (`Lowongan`, `Lamaran`, `TracerStudy`, `TefaOrder`).
    - [x] Tambahkan pemanggilan API client baru di `hubinApi` untuk lowongan, lamaran, tracer, tefa, dan mou-history.
- [x] **Fase 4: Antarmuka Frontend (HubinWorkspacePage & Tab Components)**
    - [x] Buat halaman workspace utama `HubinWorkspacePage.tsx` dengan sidebar navigasi tab internal.
    - [x] Pindahkan/Integrasikan halaman `MitraIndustriPage.tsx`, `PenempatanPklPage.tsx`, `AbsensiPklPage.tsx`, dan `MonitoringPklPage.tsx` ke dalam sistem tab workspace.
    - [x] Buat komponen tab BKK lowongan & lamaran.
    - [x] Buat komponen tab Tracer Study alumni.
    - [x] Buat komponen tab TEFA.
    - [x] Perbarui rute di `App.tsx` untuk mengarahkan rute HUBIN ke `HubinWorkspacePage.tsx`.
- [x] **Fase 5: Konsolidasi Final (Closure Scope)**
    - [x] Tambahkan mekanisme Audit Trail HUBIN terintegrasi dengan tabel `ActivityLog` global.
    - [x] Pendaftaran event `HUBIN_*` di `logOwnership.ts`.
    - [x] Implementasi endpoint `GET /hubin/activity/recent` untuk activity feed.
    - [x] Sentralisasi `studentResolverService` untuk memetakan `User.id` ke `Siswa.id`.
    - [x] Terapkan soft delete (`deleted_at` & `@@index([tenant_id, deleted_at])`) pada 5 entitas baru.
    - [x] Hitung dan sajikan 5 KPI strategis Dashboard Pimpinan di backend & frontend.
- [x] **Fase 6: Pengujian & Verifikasi**
    - [x] Uji kompilasi kode backend (`npx tsc --noEmit` sukses).
    - [x] Uji kompilasi kode frontend (`npx tsc --noEmit` sukses).
    - [x] Jalankan script uji integrasi `test-hubin-flow.ts` (sukses 100%).
    - [x] Buat/Perbarui berkas `walkthrough.md` untuk merangkum seluruh hasil konsolidasi.

# ATTENDANCE MODULE HARDENING CHECKLIST

- [x] **Fase 1: Halaman Konfigurasi & Manajemen Perangkat**
  - [x] AttendanceSettingsPage.tsx: Hardening module key, breadcrumbs, memoization, use SectionCard.
  - [x] DeviceManagementPage.tsx: Optional chaining list, replace browser alert/confirm, useMemo columns, breadcrumbs.
  - [x] FaceTemplatePage.tsx: Table sorting/pagination props, lazy load form, breadcrumbs.
  - [x] PetugasPage.tsx: Hardening module key, useMemo list, use SectionCard.

- [x] **Fase 2: Modul Operasional Presensi Gerbang & Pemecahan Kode**
  - [x] GateInputModule.tsx: Split subcomponents, wrap in AcademicPageLayout/ErrorBoundary, PremiumFeatureGate, forms a11y, no loose `: any`.
  - [x] SessionManagerModule.tsx: Split subcomponents, wrap in AcademicPageLayout/ErrorBoundary, use standard AnalyticsCard, check loops.
  - [x] PendingSiswaModule.tsx: ErrorBoundary, PremiumFeatureGate, memoized list rendering, clean typings.

- [x] **Fase 3: Tampilan Mode & Rekap Kehadiran**
  - [x] ModeMultiSesiView.tsx & ModeSimpleView.tsx: Protect mapping loops, callbacks memoization, clean types.
  - [x] TrackingSiswaPage.tsx: Add Empty State fallback, protect map loops, lazy load search form, breadcrumbs.
  - [x] RekapPage.tsx & RekapBulananKelasPage.tsx: Caching columns, complete pagination props, layout standardization.
  - [x] RekapBulananSiswaPage.tsx & RekapHarianSiswaPage.tsx: Clear loose `: any` typing, standardize stats rendering.

- [x] **Fase 4: Monitoring Guru & Subkomponen Pendukung**
  - [x] GuruMonitoringPage.tsx: Table pagination, useMemo columns, clean `: any`.
  - [x] settings/ components (KejadianKhususPanel, KelasScheduleList, TenantAttendanceForm): Form input controls a11y, useCallback handlers, React.memo + displayName.

- [x] **Fase 5: Verifikasi & Kompilasi**
  - [x] Jalankan `npx tsc --noEmit` di `absenta_frontend` untuk memastikan 0 error.
  - [x] Jalankan `npm run build` untuk memastikan bundling sukses.
  - [x] Jalankan `node ./scripts/audit-pages.cjs` untuk memeriksa kepatuhan audit.
