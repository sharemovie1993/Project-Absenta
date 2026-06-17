## Sidebar Menu Canonical

Tanggal: 2026-03-16

Dokumen ini mendefinisikan konfigurasi menu sidebar canonical (deterministik) yang di-seed ke tabel `Menu`, selaras dengan:
- Action Catalog canonical
- RBAC baseline (SUPERADMIN/ADMIN/GURU/SISWA)
- Organizational Authorization (capability extension via position)
- Sidebar Rendering Engine (backend)

Referensi implementasi seed:
- [seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts)

---

## Hierarchy

Root:
- Dashboard
- Layanan
  - Data Master
  - Akademik
  - Absensi
  - Koperasi
- Langganan Saya
- Notifications
- Settings

---

## Capability Mapping (Leaf)

### Dashboard
- Dashboard (`/dashboard`) → `dashboard.view.overview` (CORE)

### Layanan > Data Master (CORE)
- Jurusan (`/academic/jurusan`) → `academic.structures.view.list`
- Kelas (`/academic/kelas`) → `academic.structures.view.list`
- Mata Pelajaran (`/academic/mapel`) → `academic.subjects.view.list`
- Guru (`/academic/guru`) → `academic.teachers.view.list`
- Siswa (`/academic/siswa`) → `academic.students.view.list`
- Cetak Kartu Siswa (`/academic/siswa-cards`) → `academic.student_card.view.config`
- Struktur Organisasi (`/academic/struktur-organisasi`) → `academic.structure.manage`
- Wali Kelas (`/academic/wali-kelas`) → `academic.homeroom.manage`
- Users (`/users`) → `core.users.view.list`

### Layanan > Akademik (CORE)
- Tahun Pelajaran (`/academic/tahun-pelajaran`) → `academic.years.view.list`
- Semester (`/academic/semester`) → `academic.semesters.view.list`
- Guru Mapel (`/academic/guru-mapel`) → `academic.teaching.view`
- Mutasi Siswa (`/academic/mutation`) → `academic.students.view.list`
- Data Backup (`/academic/backup`) → `academic.backups.view.list`

### Layanan > Absensi (ABSENSI)
- Scan (`/attendance/ops`) → `attendance.sessions.update.attendance` (requires_petugas_active=true)
- Rekap Harian (`/attendance/rekap/siswa-harian`) → `attendance.recap.view.daily`
- Rekap Bulanan (`/attendance/rekap/siswa-bulanan`) → `attendance.recap.view.monthly`
- Rekap per Kelas (`/attendance/rekap/kelas-bulanan`) → `attendance.recap.view.monthly`
- Petugas Kelas (`/attendance/petugas`) → `attendance.officers.manage`
- Jadwal (`/attendance/jadwal-template`) → `attendance.schedules.view.list` (requires_petugas_active=true)
- Face Recognition (`/attendance/rekam-wajah`) → `attendance.manage_face_templates`

### Layanan > Koperasi (KOPERASI)
- Dashboard (`/cooperative/dashboard`) → `cooperative.dashboard.view.overview`
- Anggota (`/cooperative/members`) → `cooperative.members.view.list`
- Simpanan (`/cooperative/savings`) → `cooperative.savings.view.list`
- Pinjaman (`/cooperative/loans`) → `cooperative.loans.view.list`
- POS (`/cooperative/pos`) → `cooperative.store.orders.manage`
- Laporan (`/cooperative/reports`) → `cooperative.reports.view.daily`

### Langganan Saya (CORE)
- Langganan Saya (`/billing/my-subscription`) → `billing.my_subscription.view`

### Notifications (CORE)
- Notifikasi Saya (`/notifications/my`) → `notify.view.my`
- Pengaturan Notifikasi (`/notifications/preferences`) → `notify.update.preferences`
- Subscriptions (`/notifications/subscriptions`) → `notify.push.view.subscriptions`
- WhatsApp Health (`/notifications/whatsapp-health`) → `notify.check.status`

### Settings (CORE)
- Settings (`/settings`) → `core.sekolah.view.profile`

---

## Feature Mapping

Parent grouping memakai `required_features` agar sidebar sinkron dengan subscription tenant:
- Dashboard → CORE
- Layanan → CORE
- Data Master → CORE
- Akademik → CORE
- Absensi → ABSENSI
- Koperasi → KOPERASI
- Langganan Saya → CORE
- Notifications → CORE
- Settings → CORE

---

## Parent Menu Rule

Parent menu tidak memiliki `required_capability` dan hanya ditampilkan bila memiliki child yang lolos filter (capability/feature/organizational condition).

Implementasi rule berada di:
- [sidebar-rendering.service.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/modules/menu/services/sidebar-rendering.service.ts)

