- [x] **Fase 1: Sinkronisasi RBAC & Seeder**
    - [x] Update Catalog Aksi (Piket, Laporan, Absensi Hubin)
    - [x] Update baseline Guru di `seed_policies.ts`
    - [x] Jalankan `capability-domain-classifier.ts`
    - [x] Jalankan `seed_policies.ts`
- [x] **Fase 2: Stabilitas Riwayat Akademik (SiswaAkademik)**
    - [x] Migrasi Skema: Tambah `siswa_akademik_id` ke `PelanggaranSiswa`, `SiswaPkl`.
    - [x] Update `PelanggaranService`: Link otomatis ke `SiswaAkademik`.
    - [x] Update `HubinService`: Link otomatis ke `SiswaAkademik`.
- [x] **Fase 3: Integrasi Absensi Terpadu**
    - [x] Analisis rekapitulasi absensi
    - [x] Modifikasi query rekap untuk menyertakan `AbsensiPkl`
    - [x] Pengujian logika rekap gabungan
    - [x] Verifikasi & Uji Coba: Verifikasi fungsionalitas e2e (audit fisik, kalkulasi selisih, update stok, dan jurnal akuntansi)

# Hardening: Isolasi Multitenant Jurnal Akuntansi

- [x] Hardening Database: Tambahkan `tenantId` pada model `Journal` di `schema.prisma` dan lakukan db push
- [x] Hardening Backend Service: Perbarui `AccountingService.createJournalEntry` untuk menyertakan `tenantId` pada `Journal`
- [x] Hardening Backend Queries: Perbarui query `prisma.journal` di `report.service.ts` agar menyaring langsung dengan `tenantId`
- [x] Verifikasi Kompilasi: Pastikan backend dan frontend terkompilasi dengan bersih tanpa error

- [x] **Fase 4: Modul Pelaporan Terpusat**
    - [x] Implementasi `ReportingService` pendidikan.
    - [x] Registrasi rute pelaporan global.
- [x] **Fase 5: Modul Piket Guru (Izin Keluar)**
    - [x] Implementasi `PiketService`.
    - [x] Registrasi Modul Piket.
    - [x] Verifikasi final sistem (Build Success).
