# Daftar Halaman Ekosistem Project Absenta
**Pusat Data Matrix Feature Gating**

Dokumen ini berisi daftar seluruh halaman per modul beserta URL Path-nya untuk kebutuhan audit matrix fitur premium dan standardisasi sistem.

---

## 1. Modul Absensi (Attendance Module)
*Status: Gated Premium Preview*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Operasional Presensi Realtime | `/attendance/ops` | `pages/attendance/ops/AttendanceOpsPage.tsx" | Operasional |
| 2 | Monitoring KBM (Realtime Dashboard) | `/attendance/monitoring` | `pages/attendance/monitoring/MonitoringKbmPage.tsx` | Monitoring |
| 3 | Pengaturan Jadwal & Toleransi | `/attendance/settings` | `pages/attendance/AttendanceSettingsPage.tsx` | Konfigurasi |
| 4 | Manajemen Template Jadwal | `/attendance/jadwal-template` | `pages/attendance/jadwal-template/JadwalTemplatePage.tsx` | Konfigurasi |
| 5 | Tracking Aktivitas & Lokasi Siswa | `/attendance/tracking-siswa` | `pages/attendance/TrackingSiswaPage.tsx` | Intelligence |
| 6 | Manajemen Petugas (Gerbang/Kelas) | `/attendance/petugas` | `pages/attendance/PetugasPage.tsx` | Konfigurasi |
| 7 | Manajemen Perangkat (Device Auth) | `/attendance/devices` | `pages/attendance/DeviceManagementPage.tsx` | Hardware |
| 8 | Dashboard Utama Rekapitulasi | `/attendance/rekap` | `pages/attendance/rekap/RekapPage.tsx` | Reporting |
| 9 | Rekap Bulanan Per Siswa | `/attendance/rekap/siswa-bulanan` | `pages/attendance/rekap/RekapBulananSiswaPage.tsx` | Reporting |
| 10 | Rekap Bulanan Per Kelas | `/attendance/rekap/kelas-bulanan` | `pages/attendance/rekap/RekapBulananKelasPage.tsx` | Reporting |
| 11 | Rekap Harian Per Siswa | `/attendance/rekap/siswa-harian` | `pages/attendance/rekap/RekapHarianSiswaPage.tsx` | Reporting |
| 12 | Master Jenis Kegiatan (Absensi) | `/attendance/jenis-kegiatan` | `pages/attendance/JenisKegiatanMasterPage.tsx` | Master Data |
| 13 | Monitoring Kehadiran Guru | `/attendance/guru-monitoring` | `pages/attendance/GuruMonitoringPage.tsx` | Monitoring |
| 14 | Rekam Wajah (AI Biometric Face Recognition) | `/attendance/rekam-wajah` | `pages/attendance/FaceTemplatePage.tsx` | Intelligence/AI |
| 15 | Presensi Mandiri (Mobile Web) | `/attendance/my-attendance` | `pages/attendance/MyAttendancePage.tsx` | User Portal |
| 16 | Riwayat Mengajar (Jurnal Guru) | `/attendance/riwayat-ajar` | `pages/attendance/RiwayatAjarPage.tsx` | User Portal |

---

## 2. Modul Akademik (Academic Core)
*Status: Base Module Core Platform*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Dashboard Akademik | `/academic` | `pages/academic/AcademicPage.tsx` | Dashboard |
| 2 | Manajemen Data Guru | `/academic/guru` | `pages/academic/GuruPage.tsx` | Master Data |
| 3 | Plotting Guru Mapel | `/academic/guru-mapel` | `pages/academic/GuruMapelPage.tsx` | Kurikulum |
| 4 | Manajemen Data Siswa | `/academic/siswa` | `pages/academic/SiswaPage.tsx` | Master Data |
| 5 | Manajemen Data Kelas | `/academic/kelas` | `pages/academic/KelasPage.tsx` | Master Data |
| 6 | Manajemen Mata Pelajaran | `/academic/mapel` | `pages/academic/MapelPage.tsx` | Master Data |
| 7 | Manajemen Tahun Pelajaran | `/academic/tahun-pelajaran` | `pages/academic/TahunPelajaranPage.tsx` | Master Data |
| 8 | Manajemen Semester | `/academic/semester` | `pages/academic/SemesterPage.tsx` | Master Data |
| 9 | Manajemen Jurusan/Program | `/academic/jurusan` | `pages/academic/JurusanPage.tsx` | Master Data |
| 10 | Registrasi Siswa Baru | `/academic/registrasi-siswa` | `pages/academic/RegistrasiSiswaPage.tsx` | Kesiswaan |
| 11 | Plotting Wali Kelas | `/academic/wali-kelas` | `pages/academic/WaliKelasPage.tsx` | Kurikulum |
| 12 | Transisi Akademik (Naik/Lulus) | `/academic/transition` | `pages/academic/transition/AcademicTransitionPage.tsx` | Kesiswaan |
| 13 | Cetak Kartu Siswa (ID Cards) | `/academic/siswa-cards` | `pages/academic/StudentCardPage.tsx` | Administrasi |
| 14 | Mutasi Siswa (Pindah/Keluar) | `/academic/mutation` | `pages/academic/mutation/StudentMutationPage.tsx` | Kesiswaan |
| 15 | Struktur Organisasi (Tree) | `/academic/struktur-organisasi` | `pages/academic/struktur-organisasi/StrukturOrganisasiList.tsx` | Kelembagaan |
| 16 | Backup & Restore Akademik | `/academic/backup` | `pages/academic/BackupPage.tsx` | Keamanan |

---

## 3. Modul Koperasi (Cooperative & POS)
*Status: Gated Premium Module*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Dashboard Koperasi | `/cooperative/dashboard` | `pages/cooperative/Dashboard.tsx` | Dashboard |
| 2 | Manajemen Anggota & Simpanan | `/cooperative/members` | `pages/cooperative/Members.tsx` | Simpan Pinjam |
| 3 | Transaksi Simpanan | `/cooperative/savings` | `pages/cooperative/Savings.tsx` | Simpan Pinjam |
| 4 | Pengajuan & Kelola Pinjaman | `/cooperative/loans` | `pages/cooperative/Loans.tsx` | Simpan Pinjam |
| 5 | POS (Kasir Toko / Kantin) | `/cooperative/pos` | `pages/cooperative/POS.tsx` | Retail/Commerce |
| 6 | Layanan PPOB & Pembayaran | `/cooperative/ppob` | `pages/cooperative/PPOB.tsx` | Digital Service |
| 7 | Laporan Keuangan & Akuntansi | `/cooperative/reports` | `pages/cooperative/Accounting.tsx` | Keuangan |

---

## 4. Modul Sarpras (Infrastructure & Inventory)
*Status: Gated Premium Module*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Dashboard Sarpras | `/sarpras/dashboard" | `pages/sarpras/SarprasDashboard.tsx` | Dashboard |
| 2 | Inventaris Aset & Barang | `/sarpras/inventory` | `pages/sarpras/SarprasInventoryPage.tsx` | Manajemen Aset |
| 3 | Manajemen Peminjaman Barang | `/sarpras/loans` | `pages/sarpras/SarprasLoansPage.tsx` | Operasional |
| 4 | Pemeliharaan & Perbaikan | `/sarpras/maintenance` | `pages/sarpras/SarprasMaintenancePage.tsx` | Operasional |

---

## 5. Modul Superadmin (Platform Hub)
*Status: Internal Only (Baraya Teknologi Indonesia)*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Manajemen Tenant Global | `/tenants` | `pages/tenants/TenantsPage.tsx` | Tenant Ops |
| 2 | Infrastructure Dashboard | `/superadmin/infra` | `pages/superadmin/infra/InfrastructureDashboard.tsx` | Infra Ops |
| 3 | Control Center & Jobs | `/superadmin/infra/jobs` | `pages/superadmin/infra/InfraControlCenterPage.tsx` | Infra Ops |
| 4 | Platform Intelligence | `/superadmin/intelligence` | `pages/superadmin/PlatformIntelligencePage.tsx` | BI & Analytics |
| 5 | Revenue Intelligence | `/superadmin/intelligence/revenue` | `pages/superadmin/intelligence/RevenueIntelligencePage.tsx` | BI & Analytics |
| 6 | Revenue Global Dashboard | `/superadmin/revenue` | `pages/superadmin/revenue/RevenueDashboardPage.tsx` | Finance |
| 7 | Master Plans & Pricing | `/billing/plans` | `pages/billing/PlansPage.tsx` | Billing Global |
| 8 | Master Subscriptions | `/billing/subscriptions` | `pages/billing/SubscriptionsPage.tsx` | Billing Global |
| 9 | Manajemen Menu Dinamis | `/management/menus` | `pages/management/MenuManagementPage.tsx` | System |
| 10 | Manajemen Role & Capability | `/management/roles` | `pages/management/RoleManagementPage.tsx` | System |
| 11 | Audit Menu & Akses | `/management/menu-audit` | `pages/management/MenuAuditPage.tsx` | System |
| 12 | Sistem Backup Global | `/superadmin/backups` | `pages/superadmin/BackupsPage.tsx` | Security |

---

## 6. Modul Kurikulum (Curriculum Management)
*Status: Base/Premium Expansion*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Supervisi Akademik (Observasi) | `/kurikulum/supervisi` | `pages/kurikulum/SupervisiPage.tsx` | Monitoring |
| 2 | Struktur Kurikulum (Beban Jam) | `/kurikulum/struktur` | `pages/kurikulum/StrukturKurikulumPage.tsx` | Konfigurasi |
| 3 | Plotting Kurikulum (Master) | `/kurikulum/plotting` | `pages/kurikulum/MasterStrukturPage.tsx` | Konfigurasi |
| 4 | Manajemen Jadwal Pelajaran | `/kurikulum/jadwal` | `pages/kurikulum/JadwalPelajaranPage.tsx` | Operasional |

---

## 7. Modul Kesiswaan (Student Affairs)
*Status: Base/Premium Expansion*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Pencatatan Pelanggaran Siswa | `/kesiswaan/pelanggaran` | `pages/kesiswaan/PelanggaranPage.tsx` | Kedisiplinan |
| 2 | Master Jenis Pelanggaran (Poin) | `/kesiswaan/jenis-pelanggaran` | `pages/kesiswaan/JenisPelanggaranPage.tsx` | Konfigurasi |
| 3 | Monitoring Kedisiplinan Siswa | `/kesiswaan/monitoring` | `pages/kesiswaan/MonitoringKesiswaanPage.tsx` | Monitoring |

---

## 8. Modul Hubin / PKL (Industry Relations)
*Status: Gated Premium Module*

| No | Nama Halaman | Path URL | Lokasi File Halaman | Kategori Fitur |
|:---|:---|:---|:---|:---|
| 1 | Manajemen Mitra Industri | `/hubin/mitra` | `pages/hubin/MitraIndustriPage.tsx` | Kemitraan |
| 2 | Penempatan PKL Siswa | `/hubin/penempatan` | `pages/hubin/PenempatanPklPage.tsx` | Operasional |
| 3 | Presensi & Absensi PKL | `/hubin/absensi` | `pages/hubin/AbsensiPklPage.tsx` | Operasional |
| 4 | Monitoring & Logbook PKL | `/hubin/monitoring` | `pages/hubin/MonitoringPklPage.tsx` | Monitoring |

---
*Dibuat secara otomatis oleh Antigravity AI pada 2026-05-05 untuk kebutuhan Matrix Feature Gating.*
