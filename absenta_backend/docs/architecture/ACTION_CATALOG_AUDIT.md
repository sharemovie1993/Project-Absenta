## Action Catalog Audit & Cleanup Preparation

Tanggal: 2026-03-16

Dokumen ini melakukan audit capability (Action Catalog) untuk menyiapkan tahap cleanup selanjutnya. Tahap ini hanya audit + dokumentasi, tanpa menghapus capability dari sistem.

---

## 1) Daftar Capability Lengkap (Sumber)

Sumber capability yang diaudit:
- Canonical catalog (primary): [action_catalog_canonical_futureproof.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/action_catalog_canonical_futureproof.md)
- Seed policies (role baseline): [seed_policies.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed_policies.ts)
- Organizational position defaults: [capabilities.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/capabilities.ts)
- Menu required_capability (seed canonical): [seed.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/prisma/seed.ts)
- Legacy -> canonical mapping: [legacy_capability_mapping.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/legacy_capability_mapping.ts)

Catatan:
- Karena audit ini berjalan tanpa koneksi database (DATABASE_URL), daftar dari “permission table di database” tidak diekstrak langsung. Sebagai pengganti, audit menggunakan canonical catalog + seed sebagai representasi permission IDs yang seharusnya ada di database.

Output daftar capability lengkap:
- Capability canonical = seluruh bullet list di [action_catalog_canonical_futureproof.md](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/docs/action_catalog_canonical_futureproof.md)
- Capability non-canonical (legacy) = daftar pada bagian “Legacy Capability” di bawah

---

## 2) Legacy Capability Patterns

Kategori `LEGACY_CAPABILITY` pada repo ini didominasi oleh:
- Pola `*.manage_*`
- Pola `*.view_*`
- Pola snake_case (underscore) yang merepresentasikan varian dari format dot

Daftar legacy capability yang masih didefinisikan (sebagai mapping/fallback):
- academic.manage_academic
- academic.manage_guru
- academic.manage_jenis_kegiatan
- academic.manage_kbm
- academic.manage_kelas
- academic.manage_mapel
- academic.manage_semester
- academic.manage_siswa
- academic.manage_tahun_pelajaran
- academic.manage_wali_kelas
- academic.rekap_kbm
- academic.view_guru
- academic.view_jenis_kegiatan
- academic.view_kbm
- academic.view_kelas
- academic.view_mapel
- academic.view_semester
- academic.view_siswa
- academic.view_struktur_organisasi
- academic.view_student_card
- attendance.create_session
- attendance.manage_attendance
- attendance.manage_petugas
- attendance.manage_session
- attendance.scan
- attendance.view_attendance
- dashboard.view_guru
- dashboard.view_overview
- documents.manage_documents
- documents.view_administrative_documents
- documents.view_legal_documents
- documents.view_manual_documents
- documents.view_other_documents
- kesiswaan.manage_pelanggaran
- kesiswaan.view_pelanggaran
- kurikulum.manage_supervisi
- kurikulum.view_supervisi

Sumber daftar: [legacy_capability_mapping.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/legacy_capability_mapping.ts)

---

## 3) Duplicate Capability (underscore vs dot)

Duplicate group utama (makna sama, format berbeda):
- dashboard.view_overview ↔ dashboard.view.overview

Catatan:
- Pola serupa juga muncul di beberapa capability yang mengandung underscore sebagai suffix teknis (contoh `superadmin.infra.view.socket_global`). Untuk kasus ini, underscore bukan “duplicate format”, tetapi bagian identifier teknis.

---

## 4) Unused Capability (Backend Scan)

Definisi `UNUSED_CAPABILITY` (sesuai instruksi):
- Tidak pernah muncul pada:
  - `requireCapability('...')` (route-level)
  - `menu.required_capability` (seed menu / DB menu)
  - (opsional) string literal capability lain di backend

Hasil observasi (berdasarkan audit sebelumnya terhadap menu + mapping):
- Semua `required_capability` yang dipakai seed menu terdaftar di Action Catalog canonical.
- Capability legacy pada daftar mapping di atas tidak dipakai langsung oleh menu seed; ia ada untuk backward compatibility (fallback) selama migrasi.

Dengan demikian, kandidat `UNUSED_CAPABILITY` yang paling aman untuk cleanup (pada phase berikutnya) adalah:
- seluruh legacy keys pada bagian (2), setelah memastikan tidak ada data menu DB yang masih menyimpan value legacy pada kolom `Menu.required_capability`.

---

## 5) Aggregated Capability

Definisi `AGGREGATED_CAPABILITY`:
- Capability dengan cakupan luas (umumnya `manage_*`) yang seharusnya dipetakan ke capability granular.

Daftar aggregated capability (subset dari legacy):
- academic.manage_siswa
- academic.manage_guru
- academic.manage_kelas
- academic.manage_mapel
- academic.manage_semester
- academic.manage_tahun_pelajaran
- attendance.manage_session
- attendance.manage_attendance
- attendance.manage_petugas
- documents.manage_documents
- kesiswaan.manage_pelanggaran
- kurikulum.manage_supervisi

---

## 6) Canonical Naming Validation

Format canonical yang diharapkan:
- domain.resource.action (dot-separated, minimal 3 segmen)

Temuan:
- Banyak legacy capability hanya memiliki 2 segmen (contoh `academic.view_siswa`, `attendance.scan`), sehingga termasuk `INVALID_FORMAT` terhadap aturan canonical.

---

## 7) Proposal Canonical Catalog (Ringkas)

Aturan proposal:
- Hindari `manage_*` dan `view_*`; gunakan granular action:
  - `*.create`, `*.update`, `*.delete`
  - `*.view.list`, `*.view.detail` (dan view khusus jika perlu)
- Hindari snake_case untuk action. Bila ada varian underscore, jadikan dot sebagai canonical.

---

## 8) Mapping Legacy → Canonical

Mapping resmi yang sudah ada di repo (dipakai untuk backward compatibility):
- Lihat [legacy_capability_mapping.ts](file:///c:/Users/SERVER-DELL/Documents/Projek%20Koprasi%20Sekolah/ProjekAbsenta/backend/absenta_backend/src/config/legacy_capability_mapping.ts)

Contoh mapping penting:
- academic.view_siswa → academic.students.view.list, academic.students.view.detail, academic.students.view.history
- academic.manage_siswa → academic.students.create, academic.students.update, academic.students.delete, academic.students.send.access_token, academic.student_card.update.config
- attendance.manage_session → attendance.sessions.update.attendance, attendance.sessions.close
- dashboard.view_overview → dashboard.view.overview

