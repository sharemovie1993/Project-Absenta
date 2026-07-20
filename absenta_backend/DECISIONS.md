# DECISIONS — Absenta Backend

Dokumen ini mencatat keputusan arsitektur signifikan yang dibuat selama pengembangan platform Absenta.id.  
Format: **[ADR-NNN] Judul Keputusan** — Tanggal | Status

---

## ADR-001: Hybrid Attendance Mode Architecture
**Tanggal:** 2025-Q4 | **Status:** ✅ Implemented

**Konteks:** Sekolah memiliki kebutuhan yang sangat beragam — ada yang hanya butuh absensi gerbang sederhana, ada yang butuh sesi per kelas per mata pelajaran.

**Keputusan:** Attendance Engine mendukung dua mode yang dapat dikonfigurasi per-tenant:
- `SIMPLE`: Hanya gerbang (tap masuk/pulang) tanpa sesi kegiatan.
- `MULTI_SESI`: Gate tap menjadi prasyarat (prerequisite) sebelum siswa bisa hadir di sesi KBM/Eskul.

**Konsekuensi:** Frontend harus membaca `absensiMode` dari config tenant untuk menampilkan UI yang sesuai.

---

## ADR-002: Organizational Authorization Engine (OrgCap)
**Tanggal:** 2026-Q1 | **Status:** ✅ Implemented

**Konteks:** Role-based access saja tidak cukup untuk sekolah. Seorang Guru yang menjabat sebagai Wakasek Kurikulum butuh capability lebih dari sekedar role `GURU`.

**Keputusan:** Tambahkan layer `OrganizationalCapability` yang dikaitkan ke jabatan (`STRUKTUR_CODES`) dalam struktur organisasi. Capability ini dievaluasi bersama role capability saat pengguna melakukan request.

**Konsekuensi:**
- `position-capabilities.ts` menjadi sumber kebenaran kapabilitas per jabatan.
- Seeder `seed_policies.ts` meng-upsert `OrganizationalCapability` untuk seluruh tenant aktif.
- Middleware `requireCapability` memeriksa gabungan role capability + org capability.

---

## ADR-003: Canonical Action Catalog
**Tanggal:** 2026-Q1 | **Status:** ✅ Implemented

**Konteks:** Permission yang tidak terdaftar di catalog menimbulkan error seed dan inkonsistensi database.

**Keputusan:** `docs/action_catalog.md` adalah **satu-satunya sumber kebenaran** untuk seluruh capability ID yang valid. Seeder memvalidasi setiap baseline capability terhadap catalog ini sebelum menyimpan ke database.

**Konsekuensi:** Setiap capability baru **wajib** didaftarkan di `docs/action_catalog.md` terlebih dahulu sebelum digunakan di baseline, routes, atau position-capabilities.

---

## ADR-004: Jadwal KBM Pindah ke Domain `academic.schedules`
**Tanggal:** 2026-07-20 | **Status:** ✅ Implemented

**Konteks:** Jadwal KBM secara teknis diletakkan di bawah modul Kurikulum (`/api/kurikulum/jadwal`) namun masih menggunakan capability domain `attendance.schedules.*` yang membingungkan dan tidak mencerminkan kepemilikan modul yang sebenarnya.

**Keputusan:** Rename seluruh capability guard Jadwal KBM dari `attendance.schedules.*` menjadi `academic.schedules.*`.

**Dampak:**
- `src/modules/kurikulum/jadwal-kbm/routes/jadwal-kbm.routes.ts` → semua `requireCapability` diubah ke `academic.schedules.*`
- `src/config/position-capabilities.ts` → KURIKULUM, WALIKELAS, PETUGAS_KELAS, HUBIN mendapat `academic.schedules.view.list`
- `src/database/seeds/seed_policies.ts` → ADMIN baseline dan GURU/SISWA baseline diperbarui
- `docs/action_catalog.md` → 5 entry baru ditambahkan di section `## academic`
- Frontend: `JadwalKBMList.tsx`, `JadwalPelajaranPage.tsx`, `App.tsx` diperbarui

**Alasan Konsistensi:** Modul Kurikulum adalah modul **gratis** — tidak harus menggunakan capability domain modul berbayar Absensi.

---

## ADR-005: Jadwal Kegiatan Dipindah ke Modul Kesiswaan
**Tanggal:** 2026-07-20 | **Status:** ✅ Implemented

**Konteks:** Jadwal Kegiatan (eskul, pembiasaan, upacara) sebelumnya terdaftar di modul Attendance (plugin.ts) dengan API prefix `/api/attendance/jadwal-kegiatan` dan menggunakan capability `attendance.schedules.*`. Hal ini menyebabkan fitur yang seharusnya gratis (bagian dari Kesiswaan) ikut terkunci di balik lisensi berbayar Absensi.

**Keputusan:** Pindahkan Jadwal Kegiatan ke domain Kesiswaan:
1. Hapus registrasi dari `src/modules/attendance/plugin.ts`
2. Daftarkan di `src/infra/router.ts` dengan prefix `/api/kesiswaan/jadwal-kegiatan`
3. Ubah semua capability guard ke `kesiswaan.schedules.*`
4. Daftarkan menu di seeder di bawah KESISWAAN workspace

**Dampak:**
- `src/infra/router.ts` → tambah route `/kesiswaan/jadwal-kegiatan`
- `src/modules/attendance/plugin.ts` → hapus registrasi `/attendance/jadwal-kegiatan`
- `src/modules/attendance/jadwal-kegiatan/routes/jadwal-kegiatan.routes.ts` → capability `kesiswaan.schedules.*`
- `src/modules/attendance/anggota-kegiatan-eskul/anggota-kegiatan-eskul.routes.ts` → capability `kesiswaan.schedules.*`
- `src/modules/attendance/pembina-kegiatan-eskul/pembina-kegiatan-eskul.routes.ts` → capability `kesiswaan.schedules.*`
- `src/config/position-capabilities.ts` → KESISWAAN mendapat full CRUD, PEMBINA_ESKUL mendapat view
- `docs/action_catalog.md` → 4 entry baru ditambahkan di section `## kesiswaan`
- `src/database/seeds/seed.ts` → menu "Jadwal Kegiatan" ditambahkan ke children KESISWAAN
- Frontend: `jadwalKegiatan.api.ts`, `JadwalKegiatanPage.tsx`, `App.tsx` diperbarui

**Alasan:** Namespace `/api/kesiswaan/...` secara otomatis dilewati oleh `subscription.guard.ts` sehingga tidak memerlukan lisensi berbayar Absensi.

---

## ADR-006: Subscription Guard Namespace Bypass
**Tanggal:** 2026-Q2 | **Status:** ✅ Implemented

**Konteks:** Perlu mekanisme yang jelas untuk menentukan API mana yang memerlukan lisensi berbayar dan mana yang tidak.

**Keputusan:** `subscription.guard.ts` hanya memblokir request ke namespace `/api/attendance/...` yang memerlukan langganan modul `ABSENSI`. Namespace lain (`/api/kesiswaan/`, `/api/kurikulum/`, dll.) dilewati secara default dan tidak memerlukan langganan berbayar.

**Konsekuensi:** Pemindahan rute dari `/api/attendance/...` ke namespace lain secara otomatis membebaskan fitur dari paywall Absensi tanpa perubahan tambahan di guard.

---

## ADR-007: Seed Policy Baseline Validation
**Tanggal:** 2026-Q2 | **Status:** ✅ Implemented

**Konteks:** Seeder perlu mencegah capability yang tidak valid masuk ke baseline role (bisa menyebabkan data kotor di database).

**Keputusan:** Fungsi `ensureNoOrganizationalInBaseline` di `seed_policies.ts` memvalidasi bahwa capability yang masuk ke baseline GURU/SISWA harus terdaftar sebagai `PERSONAL` atau masuk whitelist khusus. Whitelist ini menggunakan `id.startsWith(...)` pattern.

**Konsekuensi:** Setiap capability baru yang ingin dimasukkan ke baseline GURU/SISWA dan berkategori `ORGANIZATIONAL` **harus** ditambahkan ke whitelist di `ensureNoOrganizationalInBaseline` agar seed tidak gagal.

**Whitelist pattern saat ini (per 2026-07):**
- `academic.schedules.` — Jadwal KBM (gratis, semua role)
- `kesiswaan.schedules.` — Jadwal Kegiatan (gratis, semua role)
- `attendance.schedules.` — Template Jadwal Absensi
- `attendance.sessions.` — Sesi Absensi
- `attendance.officers.` — Petugas Absensi
- `kesiswaan.` — Seluruh domain kesiswaan
- `hubin.` — Seluruh domain Hubin
- `affairs.violations.` — Pelanggaran
- `correspondence.` — Surat-menyurat
- `cooperative.tickets.` — Tiket Koperasi
- `bk.cases.` — Kasus BK
