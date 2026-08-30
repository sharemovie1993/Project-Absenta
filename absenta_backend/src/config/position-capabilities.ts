import { STRUKTUR_CODES } from './organization-structure';

/**
 * STRUKTUR_CAPABILITIES
 * Sumber Kebenaran Kanonikal untuk Alokasi Kapabilitas Jabatan Fungsional (STRUKTUR_CODES).
 *
 * Prinsip:
 * 1. Principle of Least Privilege (PoLP): Hanya memberikan izin yang dibutuhkan untuk operasional harian.
 * 2. Pemisahan Wewenang (Separation of Duties):
 *    - Catatan konseling sensitif BK (bk.counseling.view.sensitive) eksklusif untuk Guru BK.
 *    - Penandatanganan resmi surat keluar (correspondence.outbox.sign) eksklusif untuk Kepsek & TU Kepala.
 *    - Modul SPP internal sekolah menggunakan namespace tu.finance.* (membedakan dari billing.* SaaS platform).
 * 3. 100% Kanonikal: Bebas dari string legacy Bahasa Indonesia atau titik dua (:).
 */
export const STRUKTUR_CAPABILITIES: Record<string, string[]> = {
  // ═══════════════════════════════════════════════════════════════════
  // LEVEL 1: OPERASIONAL LAPANGAN & KELAS
  // ═══════════════════════════════════════════════════════════════════

  // Petugas Absensi Kelas (Sekretaris Kelas / Siswa Piket Kelas)
  [STRUKTUR_CODES.PETUGAS_KELAS]: [
    'organization.scope.unit_restricted',
    'dashboard.view.petugas',
    'dashboard.view.overview',

    // Referensi Akademik Kelas
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.teachers.view.list',
    'academic.subjects.view.list',
    'academic.schedules.view.list',

    // Operasional Presensi & Jurnal Kelas (Buku Absensi Manual Digital)
    'attendance.sessions.view.list',
    'attendance.sessions.view.detail',
    'attendance.sessions.create',
    'attendance.sessions.update',
    'attendance.sessions.close',
    'attendance.sessions.tap',
    'attendance.sessions.update.journal',
    'attendance.sessions.update.attendance',
    'attendance.markGateAbsence',         // Input catatan alasan Sakit/Izin/Dispen/Terlambat
    'attendance.getNotPresentStudents',   // Cek daftar teman belum absen
    'attendance.sessions.delete',         // Hapus sesi (dengan konfirmasi UI berlapis & syarat sesi OPEN)

    // Rekap & Feed
    'attendance.reports.view',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
  ],

  // Petugas Absensi Gerbang (Satpam / Guru Piket Depan)
  [STRUKTUR_CODES.GERBANG]: [
    'organization.scope.tenant_wide',
    'dashboard.view.gerbang',
    'dashboard.view.overview',
    'attendance.piket.view',

    // Operasional Gerbang Fisik
    'attendance.scan',
    'attendance.gate.tap.entry',
    'attendance.gate.tap.exit',
    'attendance.gate.face.verify',
    'attendance.gate.bypass',
    'attendance.markGateAbsence',
    'attendance.getNotPresentStudents',

    // Penindakan Pelanggaran & Hukuman Langsung di Tempat (Push-up / Bending)
    'affairs.violations.report',
    'affairs.violations.update',           // Update status penindakan langsung di tempat
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'affairs.violation.types.view.list',

    // Referensi Data
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.teachers.view.list',
  ],

  // Toolman (Teknisi Toolroom / Lab Bengkel Jurusan)
  [STRUKTUR_CODES.TOOLMAN]: [
    'organization.scope.unit_restricted',
    'dashboard.view.sarpras',

    // Inventaris & Lokasi Rak Bengkel
    'sarpras.inventory.view.list',
    'sarpras.inventory.manage',
    'sarpras.categories.manage',
    'sarpras.locations.manage',

    // Bon Peminjaman & Pengembalian Alat
    'sarpras.loans.view.list',
    'sarpras.loans.manage',
    'sarpras.loans.request',

    // Servis & Perbaikan Alat
    'sarpras.repairs.view.list',
    'sarpras.repairs.manage',

    // Referensi Data
    'academic.structures.view.list',
    'academic.teachers.view.list',
    'academic.students.view.list',
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LEVEL 2: STAF OPERASIONAL & ADMINISTRASI (TATA USAHA & KOPERASI)
  // ═══════════════════════════════════════════════════════════════════

  // Staf TU Persuratan & Agenda Dinas
  [STRUKTUR_CODES.TU_PERSURATAN]: [
    'organization.scope.tenant_wide',
    'dashboard.view.tu',
    'core.tenants.view.detail',

    // Surat Masuk & Disposisi
    'correspondence.inbox.view',
    'correspondence.inbox.manage',

    // Surat Keluar & Template Dinas
    'correspondence.outbox.view',
    'correspondence.outbox.manage',
    'correspondence.template.manage',

    // Pengarsipan Dokumen Digital
    'documents.view.list',
    'documents.view.detail',
    'documents.upload',
    'documents.delete',
  ],

  // Staf TU Keuangan (Internal SPP & Billing Sekolah)
  [STRUKTUR_CODES.TU_KEUANGAN]: [
    'organization.scope.tenant_wide',
    'dashboard.view.tu',
    'core.tenants.view.detail',

    // Referensi Data Siswa & Guru
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.teachers.view.list',
    'academic.structures.view.list',

    // Modul SPP & Keuangan Sekolah (tu.finance.*)
    'tu.finance.invoices.view.list',
    'tu.finance.invoices.view.detail',
    'tu.finance.invoices.generate',
    'tu.finance.invoices.cancel',
    'tu.finance.payments.create',
    'tu.finance.payments.view.history',
    'tu.finance.reports.view',
  ],

  // Staf TU Kepegawaian & Dapodik
  [STRUKTUR_CODES.TU_KEPEGAWAIAN]: [
    'organization.scope.tenant_wide',
    'dashboard.view.tu',
    'core.tenants.view.detail',

    // Master Data Induk Siswa & Dapodik
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.students.create',
    'academic.students.update',
    'academic.students.delete',
    'academic.students.manage',
    'academic.students.send.access.token', // Pengiriman token aktivasi Parent App/Siswa
    'academic.promotions.manage',          // Kenaikan kelas massal
    'academic.transitions.manage',         // Mutasi & kelulusan siswa
    'academic.student.card.view.config',
    'academic.student.card.update.config',

    // Master Data Induk Guru & Kepegawaian
    'academic.teachers.view.list',
    'academic.teachers.view.detail',
    'academic.teachers.create',
    'academic.teachers.update',
    'academic.teachers.delete',
    'academic.teachers.manage',
    'tu.staff.view.list',
    'dashboard.view.teacher.attendance',   // Rekap presensi pegawai/guru
    'attendance.recap.view.monthly',       // Rekap bulanan untuk kepegawaian/gaji

    // Kelola Akun User Sekolah
    'core.users.view.list',
    'core.users.view.detail',
    'core.users.create',
    'core.users.update',
    'core.users.delete',
    'core.users.reset.password',
    'core.users.update.email',

    // Profil Sekolah & Struktur Organisasi
    'core.sekolah.view.profile',
    'core.sekolah.update.profile',
    'academic.structures.view.list',
    'academic.structure.manage',
    'academic.structures.create',
    'academic.structures.update',
    'academic.structures.delete',
    'academic.structures.assign.teacher',
    'academic.structures.revoke.teacher',
    'academic.structures.assign.student',
    'academic.structures.revoke.student',

    // Master Mapel, Tahun Ajaran, & Semester
    'academic.subjects.view.list',
    'academic.subjects.create',
    'academic.subjects.update',
    'academic.subjects.delete',
    'academic.years.view.list',
    'academic.years.view.detail',
    'academic.years.create',
    'academic.years.update',
    'academic.years.delete',
    'academic.years.set.active',
    'academic.semesters.view.list',
    'academic.semesters.view.detail',
    'academic.semesters.create',
    'academic.semesters.update',
    'academic.semesters.delete',
    'academic.semesters.set.active',

    // Arsip Dokumen Digital
    'documents.view.list',
    'documents.view.detail',
    'documents.upload',
    'documents.delete',
  ],

  // Staf TU Sarpras (Pengadministrasi Logistik & Pengurus Barang)
  [STRUKTUR_CODES.TU_SARPRAS]: [
    'organization.scope.tenant_wide',
    'dashboard.view.tu',
    'core.tenants.view.detail',

    // Administrasi Logistik & Labeling Aset (KIB)
    'sarpras.inventory.view.list',
    'sarpras.inventory.manage',
    'sarpras.categories.manage',
    'sarpras.locations.manage',

    // Serah-Terima Peminjaman & Perbaikan
    'sarpras.loans.view.list',
    'sarpras.loans.manage',
    'sarpras.repairs.view.list',
    'sarpras.repairs.manage',
  ],

  // Manajer Toko Koperasi (Kasir POS Minimarket Koperasi)
  [STRUKTUR_CODES.MANAJER_TOKO_KOPERASI]: [
    'organization.scope.tenant_wide',
    'academic.structures.view.tree',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list',
    'cooperative.savings.view.history',
    'cooperative.members.view.list',
    'cooperative.members.view.detail',
    'cooperative.points.view',
    'cooperative.loans.apply',

    // Operasional POS Kasir & Stok Produk
    'cooperative.store.view.catalog',
    'cooperative.store.orders.manage',
    'cooperative.store.orders.view.list',
    'cooperative.store.inventory.manage',
    'cooperative.store.products.view.list',
    'cooperative.store.products.view.detail',
    'cooperative.store.products.create',
    'cooperative.store.products.update',
    'cooperative.store.products.delete',
    'cooperative.store.categories.manage',
    'cooperative.store.transactions.view',

    // Promosi, PPOB, & Tiket Bantuan Kasir
    'cooperative.vouchers.manage',
    'cooperative.vouchers.view.list',
    'cooperative.ppob.transact',
    'cooperative.ppob.manage.products',
    'cooperative.ppob.view.products',
    'cooperative.tickets.view.list',
    'cooperative.tickets.view.detail',
    'cooperative.tickets.reply',
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LEVEL 3: KOORDINATOR UNIT & PEMBINA
  // ═══════════════════════════════════════════════════════════════════

  // Wali Kelas
  [STRUKTUR_CODES.WALIKELAS]: [
    'organization.scope.unit_restricted',
    'dashboard.view.walikelas',
    'dashboard.view.overview',
    'core.tenants.view.detail',

    // Referensi Siswa Binaan
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.students.view.history',
    'academic.students.update',
    'academic.students.send.access.token', // Pengiriman token & link aktivasi Parent App untuk siswa binaan

    // Input Izin/Sakit/Dispen dari Ortu & Monitoring Presensi
    'attendance.getNotPresentStudents',   // Cek siswa belum masuk gerbang
    'attendance.markGateAbsence',         // Input Izin/Sakit/Dispen atas laporan ortu
    'attendance.sessions.update.attendance',// Validasi presensi jam pelajaran
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'attendance.reports.view',
    'attendance.sessions.view.detail',
    'attendance.officers.view',
    'attendance.officers.manage',
    'attendance.manage.petugas',

    // Pelanggaran & Rujukan BK & Prestasi
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'affairs.violations.report',
    'affairs.violation.types.view.list',
    'affairs.achievements.view.list',
    'affairs.achievements.create',
    'bk.cases.view.list',                  // Ringkasan status kasus (tanpa curhat sensitif BK)
    'bk.referrals.create',                 // Buat rujukan konseling ke BK

    // Akademik & PKL
    'academic.teaching.view',
    'academic.structures.view.list',
    'academic.structures.view.tree',
    'academic.homeroom.manage',
    'hubin.absensi.view.history',
    'academic.schedules.view.list',
    'affairs.schedules.view.list',
    'attendance.schedules.view.list',
  ],

  // BPBK (Guru Bimbingan Konseling / Konselor Sekolah)
  [STRUKTUR_CODES.BPBK]: [
    'organization.scope.tenant_wide',
    'dashboard.view.kesiswaan',
    'dashboard.view.violation.stats',

    // Referensi Siswa & Presensi
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.students.view.history',
    'academic.structures.view.list',
    'attendance.student.view.stats',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'attendance.reports.view',

    // Modul BK Khusus (Kerahasiaan Tinggi)
    'bk.cases.view.list',
    'bk.cases.view.detail',
    'bk.cases.manage',
    'bk.counseling.manage',
    'bk.counseling.view.sensitive',        // 🔒 HAK EKSKLUSIF GURU BK
    'bk.counseling.view.list',
    'bk.counseling.view.detail',
    'bk.summons.manage',
    'bk.summons.view.list',
    'bk.summons.view.detail',
    'bk.homevisit.manage',
    'bk.homevisit.view.list',
    'bk.homevisit.view.detail',
    'bk.assessment.manage',
    'bk.assessment.view.list',
    'bk.assessment.view.detail',
    'bk.referrals.manage',
    'bk.referrals.view.list',
    'bk.referrals.view.detail',
    'bk.reports.view',
    'bk.audit.view',
    'bk.recyclebin.view',
    'bk.recyclebin.restore',

    // Pelanggaran & Piket & Prestasi (Koordinasi)
    'affairs.violations.report',
    'affairs.violations.update',
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'affairs.violation.types.view.list',
    'affairs.achievements.view.list',
    'affairs.achievements.create',
    'attendance.piket.view',
    'attendance.piket.manage',
  ],

  // Pembina Eskul (Pembina Ekstrakurikuler)
  [STRUKTUR_CODES.PEMBINA_ESKUL]: [
    'organization.scope.unit_restricted',
    'dashboard.view.overview',
    'academic.students.view.list',
    'academic.students.view.detail',

    // Sesi Presensi Latihan Eskul
    'attendance.sessions.view.list',
    'attendance.sessions.create',
    'attendance.sessions.update',
    'attendance.sessions.tap',

    // Pencatatan Prestasi Lomba
    'affairs.achievements.create',
    'affairs.achievements.view.list',
  ],

  // Kaprog (Ketua Program Keahlian / Jurusan SMK)
  [STRUKTUR_CODES.KAPROG]: [
    'organization.scope.unit_restricted',
    'academic.teaching.rekap',
    'academic.students.view.list',
    'academic.teachers.view.list',
    'academic.teachers.view.detail',

    // Plotting Draf PKL Siswa Jurusannya
    'hubin.pkl.view.list',
    'hubin.pkl.manage',
    'hubin.absensi.view.history',
    'hubin.absensi.recap',

    // Monitoring & Supervisi Jurusan
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'bk.cases.view.list',
    'bk.referrals.create',
    'curriculum.supervision.view.report',
  ],

  // Kabeng (Kepala Bengkel / Lab Jurusan)
  [STRUKTUR_CODES.KABENG]: [
    'organization.scope.unit_restricted',
    'dashboard.view.sarpras',

    // Inventaris & Approval Afkir/Penghapusan Barang Rusak
    'sarpras.inventory.view.list',
    'sarpras.inventory.manage',
    'sarpras.inventory.delete',            // Approval afkir barang rusak bengkel
    'sarpras.categories.manage',
    'sarpras.locations.manage',

    // Peminjaman & Approval Perbaikan Aset Bengkel
    'sarpras.loans.view.list',
    'sarpras.loans.manage',
    'sarpras.loans.request',
    'sarpras.repairs.view.list',
    'sarpras.repairs.manage',

    // Referensi Data
    'academic.structures.view.list',
    'academic.teachers.view.list',
    'academic.students.view.list',
  ],

  // ═══════════════════════════════════════════════════════════════════
  // LEVEL 4 & LEVEL 5: MANAJEMEN MANAJERIAL & KEPALA SEKOLAH
  // ═══════════════════════════════════════════════════════════════════

  // Waka Kurikulum & Tim Kurikulum
  [STRUKTUR_CODES.KURIKULUM]: [
    'organization.scope.tenant_wide',
    'dashboard.view.kurikulum',
    'academic.manage.academic',
    'academic.activities.view.grouped',
    'academic.teaching.rekap',

    // Tahun Ajaran, Semester, & Struktur Sekolah
    'academic.years.view.list', 'academic.years.view.detail', 'academic.years.create', 'academic.years.update', 'academic.years.delete', 'academic.years.set.active',
    'academic.semesters.view.list', 'academic.semesters.view.detail', 'academic.semesters.create', 'academic.semesters.update', 'academic.semesters.delete', 'academic.semesters.set.active',
    'academic.structures.view.list', 'academic.structures.view.tree', 'academic.structures.create', 'academic.structures.update', 'academic.structures.delete',
    'academic.structures.assign.teacher', 'academic.structures.revoke.teacher', 'academic.structures.assign.student', 'academic.structures.revoke.student',

    // Master Mapel, Plotting Jam Mengajar, & Wali Kelas
    'academic.subjects.view.list', 'academic.subjects.view.detail', 'academic.subjects.create', 'academic.subjects.update', 'academic.subjects.delete', 'academic.subjects.manage',
    'academic.teaching.view', 'academic.teaching.manage',
    'academic.homeroom.manage',
    'academic.teachers.view.list', 'academic.teachers.view.detail', 'academic.teachers.view.history',
    'academic.students.view.list', 'academic.students.view.detail',

    // Jadwal KBM Mingguan & Jadwal Piket Guru Harian
    'academic.schedules.view.list', 'academic.schedules.manage', 'academic.schedules.create', 'academic.schedules.update', 'academic.schedules.delete',
    'attendance.schedules.view.list', 'attendance.schedules.manage', 'attendance.schedules.create', 'attendance.schedules.update', 'attendance.schedules.delete',
    'curriculum.piket.schedules.view', 'curriculum.piket.schedules.create', 'curriculum.piket.schedules.update', 'curriculum.piket.schedules.delete', 'curriculum.piket.schedules.manage',

    // Supervisi Akademik Guru
    'curriculum.supervision.manage', 'curriculum.supervision.view.report', 'curriculum.supervision.view.schedule', 'curriculum.supervision.create.record', 'curriculum.supervision.update.record', 'curriculum.supervision.delete.record',

    // Presensi & Kegiatan Akademik
    'attendance.sessions.view.list', 'attendance.sessions.view.detail', 'attendance.reports.view',
    'attendance.events.view.list', 'attendance.events.create', 'attendance.events.delete',

    // Pencatatan Pinjam Proyektor / Terminal KBM
    'sarpras.loans.request',
    'sarpras.loans.view.list',

    // Monitoring Modul Lain
    'hubin.pkl.view.list',
    'affairs.violations.view.list',
    'affairs.violation.types.view.list',
    'bk.cases.view.list', 'bk.cases.view.detail', 'bk.assessment.view.list',
  ],

  // Waka Kesiswaan & Tim Kesiswaan
  [STRUKTUR_CODES.KESISWAAN]: [
    'organization.scope.tenant_wide',
    'dashboard.view.kesiswaan',
    'dashboard.view.violation.stats',

    // Tata Tertib & Pelanggaran (Full Management)
    'affairs.violations.report',
    'affairs.violations.update',
    'affairs.violations.delete',            // Hak mengedit/menghapus salah input pelanggaran
    'affairs.violations.manage',
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'affairs.violation.types.view.list',
    'affairs.violation.types.create',        // Master jenis & poin pelanggaran
    'affairs.violation.types.update',
    'affairs.violation.types.delete',
    'affairs.violation.types.manage',

    // Master Jenis & Catatan Prestasi Siswa
    'affairs.achievements.view.list',
    'affairs.achievements.create',

    // Pengumuman Massal & Event
    'notify.announcements.manage',
    'attendance.events.view.list',
    'attendance.events.create',
    'attendance.events.delete',

    // Presensi & Data Referensi Siswa
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.students.view.history',
    'academic.teachers.view.list',
    'academic.structures.view.list',
    'attendance.student.view.stats',
    'attendance.piket.manage',
    'attendance.piket.view',
    'attendance.sessions.view.list',
    'attendance.sessions.update.attendance',
    'attendance.sessions.tap',
    'attendance.reports.view',

    // Monitoring BK
    'bk.cases.view.list',
    'bk.cases.view.detail',                // Ringkasan status kasus (tanpa isi curhat sensitif BK)
  ],

  // Waka Hubin (Hubungan Industri / Humas)
  [STRUKTUR_CODES.HUBIN]: [
    'organization.scope.tenant_wide',
    'dashboard.view.hubin',

    // Penempatan & Absensi PKL
    'hubin.pkl.view.list',
    'hubin.pkl.manage',
    'hubin.absensi.recap',
    'hubin.absensi.view.history',
    'hubin.absensi.verify',
    'hubin.guidance.manage',
    'hubin.logbook.manage',

    // Kerjasama Industri, TEFA, & BKK
    'hubin.mou.view.list',
    'hubin.mou.manage',
    'hubin.partners.manage',
    'hubin.tefa.manage',
    'hubin.bkk.manage',
    'hubin.lamaran.manage',
    'hubin.tracer.view',
    'reports.hubin.view',

    // Referensi Data
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.structures.view.list',
    'academic.teachers.view.list',
  ],

  // BKK (Ketua Bursa Kerja Khusus)
  [STRUKTUR_CODES.BKK]: [
    'organization.scope.tenant_wide',
    'dashboard.view.hubin',
    'hubin.bkk.manage',
    'hubin.lamaran.manage',
    'hubin.tracer.view',
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.structures.view.list',
    'hubin.pkl.view.list',
    'hubin.mou.view.list',
  ],

  // Waka Sarpras (Sarana Prasarana Global Instansi)
  [STRUKTUR_CODES.SARPRAS]: [
    'organization.scope.tenant_wide',
    'dashboard.view.sarpras',

    // Master Aset & Approval Afkir/Penghapusan
    'sarpras.inventory.view.list',
    'sarpras.inventory.manage',
    'sarpras.inventory.delete',            // Approval pengafkiran/penghapusan aset
    'sarpras.categories.manage',
    'sarpras.locations.manage',

    // Approval Peminjaman & Servis Besar
    'sarpras.loans.view.list',
    'sarpras.loans.manage',
    'sarpras.loans.request',
    'sarpras.repairs.view.list',
    'sarpras.repairs.manage',

    // Referensi Data
    'academic.structures.view.list',
    'academic.teachers.view.list',
    'academic.students.view.list',
  ],

  // Koordinator / Kepala Tata Usaha (TU_KEPALA)
  [STRUKTUR_CODES.TU_KEPALA]: [
    'organization.scope.tenant_wide',
    'dashboard.view.tu',
    'core.tenants.view.detail',

    // Supervisi Staf TU
    'tu.staff.view.list',
    'tu.staff.manage',

    // Persuratan & TTD Resmi
    'correspondence.inbox.view',
    'correspondence.inbox.manage',
    'correspondence.outbox.view',
    'correspondence.outbox.manage',
    'correspondence.outbox.sign',           // TTD Resmi Surat Dinas

    // Data Induk Siswa & Guru
    'academic.students.view.list', 'academic.students.view.detail', 'academic.students.create', 'academic.students.update', 'academic.students.delete', 'academic.students.manage',
    'academic.teachers.view.list', 'academic.teachers.view.detail', 'academic.teachers.create', 'academic.teachers.update', 'academic.teachers.delete', 'academic.teachers.manage',
    'academic.structures.view.list', 'academic.structure.manage', 'academic.structures.create', 'academic.structures.update', 'academic.structures.delete',
    'academic.structures.assign.teacher', 'academic.structures.revoke.teacher', 'academic.structures.assign.student', 'academic.structures.revoke.student',

    // SPP & Keuangan Sekolah (tu.finance.*)
    'tu.finance.invoices.view.list', 'tu.finance.invoices.view.detail', 'tu.finance.invoices.generate', 'tu.finance.invoices.cancel',
    'tu.finance.payments.create', 'tu.finance.payments.view.history',

    // Logistik & Arsip
    'documents.view.list', 'documents.view.detail',
    'sarpras.inventory.view.list', 'sarpras.loans.view.list',
    'academic.promotions.manage', 'academic.transitions.manage', 'academic.homeroom.manage',
    'academic.years.view.list', 'academic.years.view.detail', 'academic.years.create', 'academic.years.update', 'academic.years.delete', 'academic.years.set.active', 'academic.years.manage',
    'academic.semesters.view.list', 'academic.semesters.view.detail', 'academic.semesters.create', 'academic.semesters.update', 'academic.semesters.delete', 'academic.semesters.set.active', 'academic.semesters.manage',
    'academic.subjects.view.list', 'academic.subjects.create', 'academic.subjects.update', 'academic.subjects.delete', 'academic.subjects.manage',
    'core.sekolah.view.profile', 'core.sekolah.update.profile',
    'core.users.view.list', 'core.users.view.detail', 'core.users.view.roles', 'core.users.permissions.view', 'core.users.effective.capabilities.view', 'core.users.create', 'core.users.update', 'core.users.delete', 'core.users.reset.password',
  ],

  // Kepala Sekolah (Pimpinan Eksekutif Sekolah — Level 5)
  [STRUKTUR_CODES.KEPALA_SEKOLAH]: [
    'organization.scope.tenant_wide',
    'dashboard.view.kepsek',
    'dashboard.view.student.stats',
    'dashboard.view.teacher.attendance',
    'dashboard.view.sarpras',
    'dashboard.view.violation.stats',
    'dashboard.view.financial.summary',
    'dashboard.view.hubin',

    // Executive Monitoring Guru & Siswa
    'academic.teachers.view.list', 'academic.teachers.view.detail',
    'academic.students.view.list', 'academic.students.view.detail', 'academic.students.view.history',

    // Supervisi Akademik Utama
    'curriculum.supervision.view.schedule', 'curriculum.supervision.view.report', 'curriculum.supervision.create.record', 'curriculum.supervision.update.record', 'curriculum.supervision.delete.record',

    // Executive Monitoring Modul
    'affairs.violations.view.list', 'affairs.violations.view.detail',
    'affairs.achievements.view.list',
    'attendance.piket.view', 'attendance.reports.view',
    'attendance.sessions.view.list', 'attendance.sessions.view.detail',
    'attendance.recap.view.daily', 'attendance.recap.view.monthly', 'attendance.recap.view.global',
    'sarpras.inventory.view.list', 'sarpras.loans.view.list', 'sarpras.repairs.view.list',
    'billing.subscriptions.view.active',
    'hubin.pkl.view.list', 'hubin.absensi.view.history', 'hubin.absensi.recap', 'hubin.mou.view.list', 'hubin.tracer.view',
    'bk.cases.view.list', 'bk.cases.view.detail', 'bk.reports.view', 'bk.audit.view',

    // Persurat & TTD Elektronik Dokumen Resmi
    'correspondence.inbox.view',
    'correspondence.outbox.view',
    'correspondence.outbox.sign',           // ✍️ Penandatanganan Elektronik Kepsek
  ],

  // ═══════════════════════════════════════════════════════════════════
  // KOPERASI SEKOLAH (PENGURUS & PENGAWAS)
  // ═══════════════════════════════════════════════════════════════════

  [STRUKTUR_CODES.BENDAHARA_KOPERASI]: [
    'organization.scope.tenant_wide',
    'academic.structures.view.tree',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list',
    'cooperative.members.view.list', 'cooperative.members.view.detail', 'cooperative.members.create', 'cooperative.members.update', 'cooperative.members.delete', 'cooperative.members.manage',
    'cooperative.savings.create', 'cooperative.savings.deposit', 'cooperative.savings.withdraw', 'cooperative.savings.view.list', 'cooperative.savings.view.detail', 'cooperative.savings.view.history',
    'cooperative.points.view',
    'cooperative.store.view.catalog',
    'cooperative.loans.view.list', 'cooperative.loans.apply', 'cooperative.loans.repay',
    'cooperative.reports.view.financial', 'cooperative.reports.view.daily', 'cooperative.reports.view.monthly',
    'cooperative.savings.types.manage', 'cooperative.savings.manage',
    'cooperative.loans.view.detail', 'cooperative.loans.types.manage',
    'cooperative.store.orders.view.list', 'cooperative.store.transactions.view', 'cooperative.store.products.view.list', 'cooperative.store.products.view.detail',
    'cooperative.points.manage',
    'cooperative.shu.manage', 'cooperative.shu.calculate', 'cooperative.shu.view.report',
    'cooperative.settings.view', 'cooperative.vouchers.view.list', 'cooperative.tickets.view.list', 'cooperative.tickets.view.detail'
  ],

  [STRUKTUR_CODES.KETUA_KOPERASI]: [
    'organization.scope.tenant_wide',
    'academic.structures.view.tree',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list',
    'cooperative.members.view.list', 'cooperative.members.view.detail', 'cooperative.members.create', 'cooperative.members.update', 'cooperative.members.delete', 'cooperative.members.manage',
    'cooperative.savings.view.history', 'cooperative.points.view', 'cooperative.store.view.catalog',
    'cooperative.loans.view.list', 'cooperative.loans.apply', 'cooperative.loans.approve', 'cooperative.loans.repay',
    'cooperative.reports.view.financial', 'cooperative.reports.view.daily', 'cooperative.reports.view.monthly',
    'cooperative.loans.view.detail', 'cooperative.loans.reject',
    'cooperative.savings.view.list', 'cooperative.savings.view.detail',
    'cooperative.store.orders.view.list', 'cooperative.store.products.view.list', 'cooperative.store.products.view.detail',
    'cooperative.tickets.view.list', 'cooperative.tickets.view.detail',
    'cooperative.shu.approve', 'cooperative.shu.view.report',
    'cooperative.settings.view', 'cooperative.vouchers.view.list'
  ],

  [STRUKTUR_CODES.SEKRETARIS_KOPERASI]: [
    'organization.scope.tenant_wide',
    'academic.structures.view.tree',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list', 'cooperative.announcements.create', 'cooperative.announcements.delete',
    'cooperative.members.view.list', 'cooperative.members.view.detail', 'cooperative.members.create', 'cooperative.members.update', 'cooperative.members.delete', 'cooperative.members.manage',
    'cooperative.savings.view.history', 'cooperative.points.view', 'cooperative.store.view.catalog', 'cooperative.loans.apply',
    'cooperative.vouchers.manage', 'cooperative.vouchers.view.list',
    'cooperative.tickets.create', 'cooperative.tickets.reply', 'cooperative.tickets.update.status', 'cooperative.tickets.view.detail', 'cooperative.tickets.view.list',
    'cooperative.members.activate', 'cooperative.members.deactivate', 'cooperative.members.view.status',
    'cooperative.savings.view.list', 'cooperative.savings.view.detail',
    'cooperative.loans.view.list', 'cooperative.loans.view.detail',
    'cooperative.store.orders.view.list', 'cooperative.store.products.view.list', 'cooperative.store.products.view.detail'
  ],

  [STRUKTUR_CODES.PENGAWAS_KOPERASI]: [
    'organization.scope.tenant_wide',
    'academic.structures.view.tree',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list',
    'cooperative.members.view.list', 'cooperative.members.view.detail',
    'cooperative.savings.view.list', 'cooperative.savings.view.history', 'cooperative.points.view',
    'cooperative.store.view.catalog',
    'cooperative.loans.view.list', 'cooperative.loans.apply',
    'cooperative.reports.view.financial', 'cooperative.reports.view.daily', 'cooperative.reports.view.monthly',
    'cooperative.savings.view.detail', 'cooperative.loans.view.detail',
    'cooperative.store.orders.view.list', 'cooperative.store.transactions.view', 'cooperative.store.products.view.list', 'cooperative.store.products.view.detail',
    'cooperative.tickets.view.list', 'cooperative.tickets.view.detail',
    'cooperative.shu.view.report', 'cooperative.settings.view', 'cooperative.vouchers.view.list'
  ]
};
