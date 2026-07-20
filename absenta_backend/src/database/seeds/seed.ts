/**
 * 🌱 TRAE.AI System Tenant & Superadmin Seeder
 * --------------------------------------------
 * Digunakan untuk membuat data awal tenant "system"
 * beserta user superadmin global.
 *
 * Schema prisma sesuai dengan model:
 * Tenant, Role, User
 */

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedPolicies } from './seed_policies';
import { seedCore } from './seed_core';
import { seedCooperative } from './seed_cooperative';
import { seedJobdesk } from './seed_jobdesk';
import { seedSarprasCatalog } from './seed_sarpras_catalog';
import { seedMapelPresets } from './seed_mapel_presets';
import { seedKurikulumStandards } from './seed_kurikulum_standards';
import { seedJurusanPresets } from './seed_jurusan_presets';
import { seedCalendarPresets } from './seed_calendar_presets';
import { strukturOrganisasiService } from '../../modules/academic/struktur-organisasi/services/struktur-organisasi.service';
import { seedDefaultJenisKegiatanForTenant } from '../../modules/academic/jenis-kegiatan-master/services/jenis-kegiatan-master.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seed data awal TRAE.AI ...');

  // 1️⃣ Buat tenant "system" secara manual (id = 'system')
  const systemTenant = await prisma.tenant.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      name: 'System Tenant',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Tenant "system" siap. ID: ${systemTenant.id}`);

  // 1.2️⃣ RUN POLICY SEEDER (RBAC Baseline)
  // Ini harus dijalankan pertama agar Role & Permission siap sebelum digunakan User
  console.log('🔐 Menjalankan Policy Engine seeding (Role & Permissions)...');
  await seedPolicies();
  console.log('✅ Policy Engine seeding selesai.');

  // 1.5️⃣ Cleanup Junk Data (Dummy/Brutal Roles)
  console.log('🧹 Cleaning up junk roles...');
  try {
    const junkRoleNames = ['Dummy Role', 'Brutal Role', 'Role 1'];
    const junkRoles = await prisma.role.findMany({
      where: { name: { in: junkRoleNames } }
    });

    if (junkRoles.length > 0) {
      const junkRoleIds = junkRoles.map(r => r.id);
      // Delete users with these roles first
      await prisma.user.deleteMany({
        where: { role_id: { in: junkRoleIds } }
      });
      // Delete the roles
      await prisma.role.deleteMany({
        where: { id: { in: junkRoleIds } }
      });
      console.log(`✅ Deleted ${junkRoles.length} junk roles.`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to cleanup junk roles:', error);
  }

  // 2️⃣ Get Superadmin Role (Created by seedPolicies)
  const superadminRole = await prisma.role.findFirst({
    where: { name: 'SUPERADMIN', tenant_id: 'system' },
  });

  if (!superadminRole) {
    throw new Error('SUPERADMIN role not found after seeding policies');
  }

  // 3️⃣ Hash password default superadmin
  const hashedPassword = await bcrypt.hash('superadmin123', 10);

  // 4️⃣ Buat user superadmin (terkait tenant system)
  await prisma.user.upsert({
    where: {
      tenant_id_email: {
        tenant_id: 'system',
        email: 'superadmin@system.com',
      },
    },
    update: {
      email_verified: true,
      role_id: superadminRole.id,
    },
    create: {
      tenant_id: 'system',
      email: 'superadmin@system.com',
      password: hashedPassword,
      full_name: 'System Superadmin',
      role_id: superadminRole.id,
      status: 'ACTIVE',
      email_verified: true,
    },
  });
  console.log(`✅ User superadmin@system.com berhasil dibuat.`);

  // 5️⃣ Upsert Global System Config (app_name bersifat global)
  console.log('🛠️ Upserting Global System Config...');
  const globalConfig = await prisma.systemConfig.upsert({
    where: { id: (await prisma.systemConfig.findFirst({ where: { tenant_id: null } }))?.id || '' },
    update: {
      app_name: 'Absenta.id',
      default_language: 'id',
      timezone: 'Asia/Jakarta',
      date_format: 'DD/MM/YYYY',
      favicon_url: 'https://api.absenta.id/uploads/424055c6c317335ab7ddf6e5c4c7b606.png',
      logo_url: 'https://api.absenta.id/uploads/efa451e2de59282485b6059d4aefcd02.png',
      support_email: 'support@absenta.id',
      support_phone: '087779937341',
      company_address: 'Jl. Cibogo Girang, Plered, Purwakarta, Jawa Barat 41162',
      company_email_billing: 'billing@absenta.id',
      company_legal_name: 'PT BARAYA TEKNOLOGI INDONESIA',
      company_npwp: '128484128409000',
      company_signature_name: 'DEWI NURHASANAH',
      company_signature_title: 'Direktur',
      company_trade_name: 'Baraya Teknologi',
      is_active: true,
      tenant_id: null,
    },
    create: {
      app_name: 'Absenta.id',
      default_language: 'id',
      timezone: 'Asia/Jakarta',
      date_format: 'DD/MM/YYYY',
      favicon_url: 'https://api.absenta.id/uploads/424055c6c317335ab7ddf6e5c4c7b606.png',
      logo_url: 'https://api.absenta.id/uploads/efa451e2de59282485b6059d4aefcd02.png',
      support_email: 'support@absenta.id',
      support_phone: '087779937341',
      company_address: 'Jl. Cibogo Girang, Plered, Purwakarta, Jawa Barat 41162',
      company_email_billing: 'billing@absenta.id',
      company_legal_name: 'PT BARAYA TEKNOLOGI INDONESIA',
      company_npwp: '128484128409000',
      company_signature_name: 'DEWI NURHASANAH',
      company_signature_title: 'Direktur',
      company_trade_name: 'Baraya Teknologi',
      is_active: true,
      tenant_id: null,
    },
  }).catch(async () => {
    // Fallback: if upsert failed due to where.id empty, create/find manually
    const existingGlobal = await prisma.systemConfig.findFirst({ where: { tenant_id: null } });
    if (existingGlobal) {
      return prisma.systemConfig.update({
        where: { id: existingGlobal.id },
        data: {
          app_name: 'Absenta.id',
          default_language: 'id',
          timezone: 'Asia/Jakarta',
          date_format: 'DD/MM/YYYY',
          favicon_url: 'https://api.absenta.id/uploads/424055c6c317335ab7ddf6e5c4c7b606.png',
          logo_url: 'https://api.absenta.id/uploads/efa451e2de59282485b6059d4aefcd02.png',
          support_email: 'support@absenta.id',
          support_phone: '087779937341',
          company_address: 'Jl. Cibogo Girang, Plered, Purwakarta, Jawa Barat 41162',
          company_email_billing: 'billing@absenta.id',
          company_legal_name: 'PT BARAYA TEKNOLOGI INDONESIA',
          company_npwp: '128484128409000',
          company_signature_name: 'DEWI NURHASANAH',
          company_signature_title: 'Direktur',
          company_trade_name: 'Baraya Teknologi',
          is_active: true,
          tenant_id: null,
        },
      });
    }
    return prisma.systemConfig.create({
      data: {
        app_name: 'Absenta.id',
        default_language: 'id',
        timezone: 'Asia/Jakarta',
        date_format: 'DD/MM/YYYY',
        favicon_url: 'https://api.absenta.id/uploads/424055c6c317335ab7ddf6e5c4c7b606.png',
        logo_url: 'https://api.absenta.id/uploads/efa451e2de59282485b6059d4aefcd02.png',
        support_email: 'support@absenta.id',
        support_phone: '087779937341',
        company_address: 'Jl. Cibogo Girang, Plered, Purwakarta, Jawa Barat 41162',
        company_email_billing: 'billing@absenta.id',
        company_legal_name: 'PT BARAYA TEKNOLOGI INDONESIA',
        company_npwp: '128484128409000',
        company_signature_name: 'DEWI NURHASANAH',
        company_signature_title: 'Direktur',
        company_trade_name: 'Baraya Teknologi',
        is_active: true,
        tenant_id: null,
      },
    });
  });
  console.log(`✅ Global System Config siap dengan app_name: ${globalConfig.app_name}`);

  // 6️⃣ Seed Menu & Role Permissions berdasarkan struktur navigasi frontend
  console.log('🧹 Cleaning up old menu data for a fresh start...');
  await prisma.menuRole.deleteMany({});
  await prisma.menu.deleteMany({});
  console.log('✅ Menu tables cleaned.');

  console.log('🧭 Menyusun seed Menu berdasarkan navigasi Premium saat ini...');

  type NavItem = {
    label: string;
    icon?: string;
    path: string | null;
    type?: string | null;
    required_capability?: string | null;
    requires_petugas_active?: boolean;
    required_features?: string[] | null;
    children?: NavItem[];
    order?: number;
  };

  // VALID_ROUTE_SET dihapus: seed menu bukan whitelist route

  // CANONICAL MENU STRUCTURE (7 Premium Groups with Emoji & Feature Gating)
  const NAV_ITEMS: NavItem[] = [
    // --- DATA MASTER ---
    {
      label: 'DATA MASTER', icon: 'Database', path: null, required_features: ['CORE'], order: 10, children: [
        { label: 'Dashboard Akademik', icon: 'LayoutDashboard', path: '/academic', required_capability: 'academic.students.view.list' },
        {
          label: 'Data Master', icon: 'Database', path: null, children: [
            { label: 'Tahun Pelajaran', icon: 'Calendar', path: '/academic/tahun-pelajaran', required_capability: 'academic.years.view.list' },
            { label: 'Semester', icon: 'Clock', path: '/academic/semester', required_capability: 'academic.semesters.view.list' },
            { label: 'Jurusan', icon: 'Briefcase', path: '/academic/jurusan', required_capability: 'academic.structures.view.list' },
            { label: 'Kelas', icon: 'Users', path: '/academic/kelas', required_capability: 'academic.structures.view.list' },
            { label: 'Mata Pelajaran', icon: 'BookOpen', path: '/academic/mapel', required_capability: 'academic.subjects.view.list' },
            { label: 'Guru', icon: 'UserCog', path: '/academic/guru', required_capability: 'academic.teachers.view.list' },
            { label: 'Siswa', icon: 'GraduationCap', path: '/academic/siswa', required_capability: 'academic.students.view.list' },
            { label: 'Dokumen Legalitas Sekolah', icon: 'FileText', path: '/documents', required_capability: 'documents.view.list' },
            { label: 'Arsip Digital Kepegawaian', icon: 'Archive', path: '/documents/member-docs', required_capability: 'academic.students.view.detail' },
          ]
        },
        {
          label: 'Persiapan Akademik', icon: 'Settings', path: null, children: [
            { label: 'Jenis Kegiatan', icon: 'Activity', path: '/academic/jenis-kegiatan', required_capability: 'academic.activities.types.manage' },
            { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/academic/prep-checklist', required_capability: 'academic.years.view.list' },
            { label: 'Kartu Siswa', icon: 'Contact', path: '/academic/siswa-cards', required_capability: 'academic.manage.siswa' },
            { label: 'Kelulusan & Kenaikan Kelas', icon: 'Move', path: '/academic/transition', required_capability: 'academic.promotions.manage' },
            { label: 'Struktur Organisasi', icon: 'Network', path: '/academic/struktur-organisasi', required_capability: 'academic.structures.view.list' },
            { label: 'Backup', icon: 'Database', path: '/academic/backup', required_capability: 'academic.backups.create' },
            { label: 'Log Aktivitas Staf', icon: 'History', path: '/academic/staff-logs', required_capability: 'core.sekolah.view.profile' },
          ]
        }
      ]
    },

    // --- KURIKULUM ---
    // Urutan berdasarkan flow operasional persiapan kurikulum sekolah:
    // 1. Dashboard → 2. Struktur → 3. Kalender → 4. Jadwal → 5. Perangkat → 6. Rekap KBM → 7. Supervisi → 8. Cetak
    {
      label: 'KURIKULUM', icon: 'Layout', path: null, required_features: ['CORE'], order: 12, children: [
        { label: 'Dashboard Kurikulum', icon: 'LayoutDashboard', path: '/kurikulum/dashboard', required_capability: 'academic.manage.academic' },
        { label: 'Struktur Kurikulum', icon: 'Layout', path: '/kurikulum/struktur', required_capability: 'academic.manage.academic' },
        { label: 'Guru Mapel', icon: 'ListChecks', path: '/kurikulum/guru-mapel', required_capability: 'academic.teaching.manage' },
        { label: 'Wali Kelas', icon: 'UserCheck', path: '/kurikulum/wali-kelas', required_capability: 'academic.homeroom.manage' },
        { label: 'Kalender Akademik', icon: 'CalendarDays', path: '/kurikulum/kalender', required_capability: 'academic.years.view.list, academic.manage.academic, academic.teaching.view' },
        { label: 'Pengaturan Jam KBM', icon: 'Clock', path: '/kurikulum/jam-kbm', required_capability: 'academic.schedules.manage, academic.manage.academic' },
        { label: 'Jadwal Pelajaran', icon: 'Calendar', path: '/kurikulum/jadwal', required_capability: 'academic.schedules.view.list, academic.manage.academic, academic.teaching.view' },
        { label: 'Perangkat Ajar (RPP)', icon: 'FileText', path: '/kurikulum/perangkat', required_capability: 'academic.teaching.view, academic.manage.academic' },
        { label: 'Rekap KBM', icon: 'BarChart2', path: '/kurikulum/rekap-kbm', required_capability: 'academic.teaching.rekap, academic.manage.academic' },
        { label: 'Supervisi Guru', icon: 'ShieldCheck', path: '/kurikulum/supervisi', required_capability: 'curriculum.supervision.manage, curriculum.supervision.view.schedule' },
        { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/kurikulum/cetak-berkas', required_capability: 'academic.manage.academic' },
      ]
    },

    // --- KESISWAAN ---
    {
      label: 'KESISWAAN', icon: 'Users', path: null, required_features: ['CORE'], order: 15, children: [
        { label: 'Dashboard Kesiswaan', icon: 'LayoutDashboard', path: '/kesiswaan/monitoring', required_capability: 'dashboard.view.kesiswaan, kesiswaan.dashboard.view' },
        { label: 'Piket & Izin Keluar', icon: 'ClipboardCheck', path: '/kesiswaan/piket', required_capability: 'attendance.piket.view, kesiswaan.piket.manage' },
        { label: 'Kasus Pelanggaran', icon: 'AlertTriangle', path: '/kesiswaan/pelanggaran', required_capability: 'affairs.violations.view.list, kesiswaan.pelanggaran.manage' },
        { label: 'Prestasi Siswa', icon: 'Trophy', path: '/kesiswaan/prestasi', required_capability: 'kesiswaan.prestasi.view, kesiswaan.prestasi.manage' },
        { label: 'Jadwal Kegiatan', icon: 'Calendar', path: '/kesiswaan/jadwal-kegiatan', required_capability: 'kesiswaan.schedules.view.list, kesiswaan.dashboard.view' },
        { label: 'Jenis Pelanggaran', icon: 'List', path: '/kesiswaan/jenis-pelanggaran', required_capability: 'affairs.violation.types.manage, kesiswaan.dashboard.view' },
        { label: 'Pengaturan Poin', icon: 'Settings', path: '/kesiswaan/settings', required_capability: 'affairs.violation.types.manage, kesiswaan.dashboard.view' },
        { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/kesiswaan/cetak-berkas', required_capability: 'dashboard.view.kesiswaan, kesiswaan.dashboard.view' },
      ]
    },

    // --- ABSENSI ---
    {
      label: 'ABSENSI', icon: 'Clock', path: null, required_features: ['ABSENSI'], order: 20, children: [
        { label: 'Dashboard Absensi', icon: 'LayoutDashboard', path: '/attendance/dashboard', required_capability: 'attendance.manage.session, attendance.monitoring.view.live.status' },
        { label: 'Pengaturan Umum', icon: 'Settings', path: '/attendance/settings', required_capability: 'attendance.manage.session' },
        { label: 'Petugas Absensi', icon: 'UserCheck', path: '/attendance/petugas', required_capability: 'attendance.manage.petugas' },
        { label: 'Perangkat Absensi', icon: 'Cpu', path: '/attendance/devices', required_capability: 'attendance.manage.session' },
        { label: 'Pendaftaran Wajah', icon: 'Camera', path: '/attendance/rekam-wajah', required_capability: 'attendance.manage.face.templates' },
        { label: 'Operasional Presensi', icon: 'Activity', path: '/attendance/ops', required_capability: 'attendance.gate.tap.entry, attendance.sessions.create' },
        { label: 'Jurnal & Riwayat Mengajar', icon: 'FileText', path: '/attendance/riwayat-ajar', required_capability: 'attendance.sessions.update.journal, academic.teaching.view' },
        { label: 'Live Monitoring KBM Kelas', icon: 'Monitor', path: '/attendance/monitoring', required_capability: 'attendance.monitoring.view.live.status, dashboard.view.walikelas' },
        { label: 'Monitoring Mengajar Guru', icon: 'UserCheck', path: '/attendance/guru-monitoring', required_capability: 'attendance.monitoring.view.live.status, dashboard.view.kepsek' },
        { label: 'Kehadiran Saya', icon: 'User', path: '/attendance/my-attendance', required_capability: 'attendance.sessions.view.list, academic.teaching.view' },
        { label: 'Laporan & Rekap Presensi', icon: 'Calendar', path: '/attendance/rekap', required_capability: 'attendance.recap.view.daily, attendance.recap.view.monthly, attendance.recap.view.global' },
        { label: 'Tracking Aktivitas Siswa', icon: 'MapPin', path: '/attendance/tracking-siswa', required_capability: 'attendance.recap.view.global' },
        { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/attendance/cetak-berkas', required_capability: 'attendance.sessions.view.list' }
      ]
    },

    // --- PERSURATAN (CORRESPONDENCE) ---
    {
      label: 'PERSURATAN', icon: 'Mail', path: null, required_features: ['CORE'], order: 22, children: [
        { label: 'Dashboard Persuratan', icon: 'LayoutDashboard', path: '/correspondence/dashboard', required_capability: 'correspondence.inbox.view' },
        { label: 'Surat Masuk', icon: 'Inbox', path: '/correspondence/surat-masuk', required_capability: 'correspondence.inbox.view' },
        { label: 'Surat Keluar', icon: 'Send', path: '/correspondence/surat-keluar', required_capability: 'correspondence.outbox.view' },
      ]
    },

    // --- BP/BK ---
    {
      label: 'BP/BK', icon: 'HeartHandshake', path: null, required_features: ['BPBK'], order: 25, children: [
        { label: 'Dashboard BPBK', icon: 'LayoutDashboard', path: '/bpbk/dashboard', required_capability: 'bk.cases.view.list, bk.counseling.view.list' },
        { label: 'Data Kasus Siswa', icon: 'Users', path: '/bpbk/siswa', required_capability: 'bk.cases.view.list' },
        { label: 'Monitoring Kasus Pembelajaran', icon: 'ShieldAlert', path: '/bpbk/cases', required_capability: 'bk.cases.view.list' },
        { label: 'Layanan Konseling', icon: 'HeartHandshake', path: '/bpbk/konseling', required_capability: 'bk.counseling.view.list' },
        { label: 'Pemanggilan Orang Tua', icon: 'Mail', path: '/bpbk/pemanggilan', required_capability: 'bk.summons.view.list, bk.summons.manage' },
        { label: 'Home Visit', icon: 'Home', path: '/bpbk/homevisit', required_capability: 'bk.homevisit.view.list, bk.homevisit.manage' },
        { label: 'Asesmen & Pemetaan Minat Siswa', icon: 'ClipboardList', path: '/bpbk/asesmen', required_capability: 'bk.assessment.view.list' },
        { label: 'Rujukan Kasus', icon: 'Send', path: '/bpbk/rujukan', required_capability: 'bk.referrals.view.list, bk.referrals.create' },
        { label: 'Laporan & Statistik', icon: 'BarChart3', path: '/bpbk/reports', required_capability: 'bk.reports.view' },
        { label: 'Log Audit BK', icon: 'History', path: '/bpbk/audit', required_capability: 'bk.audit.view' },
        { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/bpbk/cetak-berkas', required_capability: 'bk.reports.view' },
      ]
    },

    // --- HUBIN ---
    {
      label: 'HUBIN', icon: 'Handshake', path: null, required_features: ['HUBIN'], order: 30, children: [
        { label: 'Dashboard Hubin', icon: 'LayoutDashboard', path: '/hubin/dashboard', required_capability: 'dashboard.view.hubin' },
        { label: 'Kemitraan & MoU', icon: 'Building2', path: '/hubin/mitra', required_capability: 'hubin.partners.manage, hubin.mou.view.list' },
        { label: 'Penempatan PKL', icon: 'Users', path: '/hubin/penempatan', required_capability: 'hubin.pkl.manage, hubin.pkl.view.list' },
        { label: 'Presensi Mandiri Siswa', icon: 'Clock', path: '/hubin/absensi', required_capability: 'hubin.self.pkl, hubin.absensi.view.history, hubin.pkl.view.list' },
        { label: 'Monitoring & Jurnal', icon: 'Activity', path: '/hubin/monitoring', required_capability: 'hubin.pkl.view.list, hubin.logbook.manage' },
        { label: 'BKK & Lowongan Kerja', icon: 'Briefcase', path: '/hubin/bkk', required_capability: 'hubin.self.bkk, hubin.bkk.manage, hubin.lamaran.manage, hubin.partners.manage, hubin.pkl.view.list' },
        { label: 'Tracer Study (Alumni)', icon: 'GraduationCap', path: '/hubin/tracer', required_capability: 'hubin.self.tracer, hubin.tracer.view, hubin.partners.manage' },
        { label: 'Teaching Factory (TEFA)', icon: 'Hammer', path: '/hubin/tefa', required_capability: 'hubin.tefa.manage' },
        { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/hubin/cetak-berkas', required_capability: 'hubin.pkl.view.list' },
      ]
    },

    // --- SARPRAS ---
    {
      label: 'SARPRAS', icon: 'Package', path: null, required_features: ['SARPRAS'], order: 35, children: [
        { label: 'Dashboard Sarpras', icon: 'LayoutDashboard', path: '/sarpras/dashboard', required_capability: 'sarpras.inventory.view.list, dashboard.view.sarpras' },
        { label: 'Inventory Aset', icon: 'Archive', path: '/sarpras/inventory', required_capability: 'sarpras.inventory.view.list' },
        { label: 'Peminjaman', icon: 'ArrowUpCircle', path: '/sarpras/loans', required_capability: 'sarpras.loans.view.list' },
        { label: 'Pemeliharaan', icon: 'Tool', path: '/sarpras/maintenance', required_capability: 'sarpras.repairs.view.list' },
        { label: 'Cetak Berkas', icon: 'ClipboardList', path: '/sarpras/cetak-berkas', required_capability: 'sarpras.inventory.view.list' },
      ]
    },

    // --- RAPOR ---
    {
      label: 'RAPOR', icon: 'BookOpen', path: null, required_features: ['CORE'], order: 38, children: [
        { label: 'Dashboard Rapor', icon: 'LayoutDashboard', path: '/rapor/dashboard', required_capability: 'academic.homeroom.manage, dashboard.view.walikelas, academic.manage.academic' },
        { label: 'Input Nilai', icon: 'Award', path: '/rapor/nilai', required_capability: 'academic.teaching.view, academic.homeroom.manage' },
        { label: 'Cetak Rapor & Wali', icon: 'Printer', path: '/rapor/cetak', required_capability: 'dashboard.view.walikelas, academic.homeroom.manage' },
        { label: 'Projek P5', icon: 'Layers', path: '/rapor/p5', required_capability: 'academic.teaching.view, academic.manage.academic' },
      ]
    },

    // --- CBT ---
    {
      label: 'CBT', icon: 'Laptop', path: null, required_features: ['CORE'], order: 39, children: [
        { label: 'Dashboard CBT', icon: 'LayoutDashboard', path: '/cbt/dashboard', required_capability: 'academic.students.view.list' }
      ]
    },

    // --- KOPERASI ---
    {
      label: 'KOPERASI', icon: 'ShoppingCart', path: null, required_features: ['KOPERASI'], required_capability: 'cooperative.dashboard.view.overview, cooperative.savings.view.history, cooperative.points.view, cooperative.store.view.catalog, cooperative.tickets.create, cooperative.announcements.view.list', order: 40, children: [
        { label: 'Dashboard', icon: 'LayoutDashboard', path: '/cooperative/dashboard', required_capability: 'cooperative.members.view.list, cooperative.reports.view.financial, cooperative.store.orders.manage' },
        {
          label: 'Menu Anggota', icon: 'User', path: null, required_capability: 'cooperative.savings.view.history, cooperative.points.view, cooperative.store.view.catalog, cooperative.loans.apply, cooperative.tickets.create, cooperative.announcements.view.list', children: [
            { label: 'Tabungan Saya', icon: 'Wallet', path: '/cooperative/savings', required_capability: 'cooperative.savings.view.history' },
            { label: 'Pinjaman Saya', icon: 'HandHoldingHeart', path: '/cooperative/loans', required_capability: 'cooperative.loans.apply' },
            { label: 'Katalog Belanja', icon: 'ShoppingBag', path: '/cooperative/pos?mode=catalog', required_capability: 'cooperative.store.view.catalog' },
            { label: 'SHU Saya', icon: 'Award', path: '/cooperative/shu', required_capability: 'cooperative.savings.view.history' },
            { label: 'Poin & Benefit', icon: 'Sparkles', path: '/cooperative/vouchers', required_capability: 'cooperative.points.view' },
            { label: 'Pengumuman Koperasi', icon: 'Bell', path: '/cooperative/announcements', required_capability: 'cooperative.announcements.view.list' },
            { label: 'Aduan & Keluhan', icon: 'MessageSquare', path: '/cooperative/tickets', required_capability: 'cooperative.tickets.create' },
          ]
        },
        {
          label: 'Menu Pengurus', icon: 'ShieldCheck', path: null,
          // OR-logic: tampil jika punya SALAH SATU dari capabilities ini
          required_capability: 'cooperative.members.view.list, cooperative.savings.deposit, cooperative.store.orders.manage, cooperative.reports.view.financial, cooperative.loans.approve, cooperative.announcements.create, cooperative.shu.view.report, cooperative.tickets.view.list, cooperative.settings.view',
          children: [
            { label: 'Manajemen Anggota', icon: 'Users', path: '/cooperative/members', required_capability: 'cooperative.members.view.list' },
            { label: 'Input Simpanan', icon: 'PlusCircle', path: '/cooperative/savings/manage', required_capability: 'cooperative.savings.deposit' },
            { label: 'Persetujuan Pinjaman', icon: 'CheckCircle', path: '/cooperative/loans/manage', required_capability: 'cooperative.loans.approve' },
            { label: 'PPOB Admin', icon: 'Zap', path: '/cooperative/ppob', required_capability: 'cooperative.ppob.manage.products' },
            { label: 'Kelola Pengumuman', icon: 'Bell', path: '/cooperative/announcements', required_capability: 'cooperative.announcements.create' },
            { label: 'Laporan Keuangan', icon: 'FilePieChart', path: '/cooperative/reports', required_capability: 'cooperative.reports.view.financial' },
            { label: 'Manajemen SHU', icon: 'Award', path: '/cooperative/shu/manage', required_capability: 'cooperative.shu.view.report' },
            { label: 'Daftar Keluhan', icon: 'MessageSquare', path: '/cooperative/tickets/manage', required_capability: 'cooperative.tickets.view.list' },
            { label: 'Pengaturan Koperasi', icon: 'Settings', path: '/cooperative/settings', required_capability: 'cooperative.settings.view' },
          ]
        },
        {
          label: 'Menu Toko', icon: 'Store', path: null,
          required_capability: 'cooperative.store.products.view.list, cooperative.store.orders.manage, cooperative.vouchers.manage, cooperative.store.transactions.view, cooperative.vouchers.view.list',
          children: [
            { label: 'Katalog Barang', icon: 'Box', path: '/cooperative/products', required_capability: 'cooperative.store.products.view.list' },
            { label: 'POS / Kasir', icon: 'ShoppingCart', path: '/cooperative/pos', required_capability: 'cooperative.store.orders.manage, cooperative.store.transactions.view' },
            { label: 'Voucher & Promo', icon: 'Tag', path: '/cooperative/vouchers/manage', required_capability: 'cooperative.vouchers.manage, cooperative.vouchers.view.list' },
          ]
        },
      ]
    },

    // --- SISTEM ---
    {
      label: 'SISTEM', icon: 'Shield', path: null, required_features: ['CORE'], order: 50, children: [
        { label: 'Paket & Langganan', icon: 'Crown', path: '/service-center', required_capability: 'billing.subscriptions.view.active' },
        { label: 'User Management', icon: 'UserCog', path: '/users', required_capability: 'core.users.create' },
        { label: 'Settings', icon: 'Settings', path: '/settings', required_capability: 'core.system.config.update' },
        { label: 'WhatsApp Settings', icon: 'MessageSquare', path: '/settings/whatsapp', required_capability: 'whatsapp.manage.config', required_features: ['WHATSAPP'] },
        { label: 'Tiket Bantuan', icon: 'HelpCircle', path: '/support', required_capability: 'support.tickets.view' },
      ]
    },
  ];

  const PLATFORM_NAV_ITEMS: NavItem[] = [
    { label: 'Kelola Tenant', icon: 'Users', path: '/tenants', required_capability: 'superadmin.tenants.manage', order: 100 },
    {
      label: 'Helpdesk & Support',
      icon: 'HelpCircle',
      path: null,
      required_capability: null,
      order: 105,
      children: [
        { label: 'Tiket Bantuan (CS)', icon: 'MessageSquare', path: '/superadmin/support', required_capability: 'admin.tickets.view.list' },
      ],
    },
    {
      label: 'PRESET GLOBAL',
      icon: 'LayoutTemplate',
      path: null,
      required_capability: null,
      order: 108,
      children: [
        { label: 'Katalog Preset Mapel', icon: 'BookOpen', path: '/superadmin/mapel-presets', required_capability: 'superadmin.tenants.manage' },
        { label: 'Katalog Preset Jurusan', icon: 'Briefcase', path: '/superadmin/jurusan-presets', required_capability: 'superadmin.tenants.manage' },
        { label: 'Katalog Preset Kalender', icon: 'Calendar', path: '/superadmin/calendar-presets', required_capability: 'superadmin.tenants.manage' },
        { label: 'Katalog Standar JP', icon: 'Clock', path: '/superadmin/kurikulum-standards', required_capability: 'superadmin.tenants.manage' },
        { label: 'Katalog Aset Global', icon: 'Package', path: '/sarpras/catalog', required_capability: 'superadmin.tenants.manage' },
      ],
    },
    {
      label: 'Billing Platform',
      icon: 'CreditCard',
      path: null,
      required_capability: null,
      order: 110,
      children: [
        { label: 'Laporan Revenue', icon: 'TrendingUp', path: '/superadmin/revenue', required_capability: 'superadmin.revenue.view.overview' },
        { label: 'Dashboard Billing', icon: 'LayoutDashboard', path: '/billing/dashboard', required_capability: "billing.subscriptions.view.list" },
        { label: 'Paket Layanan (Plans)', icon: 'Package', path: '/billing/plans', required_capability: 'billing.plans.view.list' },
        { label: 'Langganan Tenant', icon: 'CreditCard', path: '/billing/subscriptions', required_capability: 'billing.subscriptions.view.active' },
        { label: 'Invoice & Tagihan', icon: 'FileText', path: '/billing/invoices', required_capability: 'billing.invoices.view.list' },
        { label: 'Laporan Billing', icon: 'BarChart3', path: '/billing/reports', required_capability: 'billing.subscriptions.view.list' },
        { label: 'Pengaturan Billing', icon: 'Settings', path: '/billing/settings', required_capability: 'core.system.config.view' },
        { label: 'Simulator Tripay', icon: 'TestTube', path: '/superadmin/infra/tripay-simulator', required_capability: 'payments.test.simulate' },
      ],
    },
    {
      label: 'Monitoring & Observability',
      icon: 'Activity',
      path: null,
      required_capability: null,
      order: 120,
      children: [
        { label: 'Overview Platform', icon: 'LayoutDashboard', path: '/superadmin/intelligence', required_capability: 'superadmin.platform.intelligence.view' },
        { label: 'Revenue Analytics', icon: 'TrendingUp', path: '/superadmin/intelligence/revenue', required_capability: 'superadmin.platform.intelligence.view' },
        { label: 'Upgrade Analytics', icon: 'Sparkles', path: '/superadmin/intelligence/upgrade', required_capability: 'superadmin.upgrade.intelligence.view' },
        { label: 'Live System Monitor', icon: 'Activity', path: '/superadmin/infra/monitoring', required_capability: "superadmin.infra.monitoring.view" },
        { label: 'Tripay Health Status', icon: 'Activity', path: '/superadmin/infra/tripay-health', required_capability: "superadmin.infra.monitoring.view" },
      ],
    },
    {
      label: 'Infrastruktur & Server',
      icon: 'Cpu',
      path: null,
      required_capability: null,
      order: 130,
      children: [
        { label: 'Status Socket Server', icon: 'Activity', path: '/superadmin/infra', required_capability: 'superadmin.infra.view.socket.global' },
        { label: 'Job & Scheduler Control', icon: 'Cpu', path: '/superadmin/infra/jobs', required_capability: 'superadmin.infra.monitoring.view' },
        { label: 'Arsip & Cadangan Sistem', icon: 'Archive', path: '/superadmin/backups', required_capability: 'cadangan.view.cadangan' },
      ],
    },
    {
      label: 'Kontrol Akses (Security)',
      icon: 'Shield',
      path: null,
      required_capability: null,
      order: 140,
      children: [
        { label: 'Manajemen Hak Akses (Roles)', icon: 'UserCog', path: '/management/roles', required_capability: 'superadmin.security.roles.view' },
        { label: 'Manajemen Menu', icon: 'Sliders', path: '/management/menus', required_capability: 'core.menu.view.list' },
      ],
    }
  ];
  const seededMenus: Array<{ id: string; name: string; path: string | null }> = [];

  // Helper: Upsert Menu Item
  const upsertMenu = async (scope: 'TENANT' | 'PLATFORM', item: NavItem, order: number, parentId?: string) => {
    let existing = null;
    if (item.path) {
      existing = await prisma.menu.findFirst({
        where: {
          path: item.path,
          name: item.label,
          parent_id: parentId ?? null,
          scope
        }
      });
    } else if (item.label === 'divider') {
      existing = await prisma.menu.findFirst({ where: { order, scope, name: 'divider' } });
    } else {
      existing = await prisma.menu.findFirst({
        where: {
          name: item.label,
          parent_id: parentId ?? null,
          scope
        }
      });
    }

    if (existing) {
      const updated = await prisma.menu.update({
        where: { id: existing.id },
        data: {
          name: item.label,
          icon: item.icon,
          path: item.path,
          order,
          is_active: true,
          parent_id: parentId ?? null,
          required_capability: item.required_capability ?? null,
          required_features: item.required_features ? item.required_features : Prisma.DbNull,
          requires_petugas_active: item.requires_petugas_active ?? false,
          scope,
        },
      });
      seededMenus.push({ id: updated.id, name: updated.name, path: updated.path ?? null });
      return updated;
    } else {
      const created = await prisma.menu.create({
        data: {
          name: item.label,
          icon: item.icon,
          path: item.path,
          order,
          is_active: true,
          parent_id: parentId ?? null,
          required_capability: item.required_capability ?? null,
          required_features: item.required_features ? item.required_features : Prisma.DbNull,
          requires_petugas_active: item.requires_petugas_active ?? false,
          scope,
        },
      });
      seededMenus.push({ id: created.id, name: created.name, path: created.path ?? null });
      return created;
    }
  };

  console.log('🔄 Upserting Menus based on Canonical Structure...');

  const keepTenantMenuIds = new Set<string>();
  const keepPlatformMenuIds = new Set<string>();

  const seedTree = async (scope: 'TENANT' | 'PLATFORM', keep: Set<string>, items: NavItem[], parentId?: string) => {
    let i = 1;
    for (const item of items) {
      const desiredOrder = (item as any).order ?? i * 10;
      const menu = await upsertMenu(scope, item, desiredOrder, parentId);
      keep.add(menu.id);
      if (item.children && item.children.length > 0) {
        await seedTree(scope, keep, item.children, menu.id);
      }
      i++;
    }
  };

  await seedTree('TENANT', keepTenantMenuIds, NAV_ITEMS, undefined);
  await seedTree('PLATFORM', keepPlatformMenuIds, PLATFORM_NAV_ITEMS, undefined);

  console.log(`✅ Menu & Role permissions seeded. Total menu items: ${seededMenus.length}`);

  await prisma.menu.updateMany({
    where: { id: { notIn: Array.from(keepTenantMenuIds) }, scope: 'TENANT' },
    data: { is_active: false },
  });

  await prisma.menu.updateMany({
    where: { id: { notIn: Array.from(keepPlatformMenuIds) }, scope: 'PLATFORM' },
    data: { is_active: false },
  });

  // 6.2️⃣ Seed Modules (Categories)
  console.log('📦 Seeding Modules (Catalog Categories)...');
  const modulesToSeed = [
    { id: 'ABSENSI', name: 'Absensi', icon: 'Building2', order: 1, description: 'Sistem kehadiran cerdas dengan Face Recognition & Geofencing.' },
    { id: 'KOPERASI', name: 'Koperasi', icon: 'Wallet', order: 2, description: 'Manajemen anggota, simpanan, pinjaman, dan POS Koperasi.' },
    { id: 'SARPRAS', name: 'Inventory', icon: 'Package', order: 3, description: 'Otomasi inventaris sekolah, peminjaman aset, hingga perbaikan.' },
    { id: 'HUBIN', name: 'Hubin', icon: 'Handshake', order: 4, description: 'Manajemen kemitraan industri dan monitoring PKL siswa.' },
    { id: 'WHATSAPP', name: 'WhatsApp', icon: 'MessageSquare', order: 5, description: 'Layanan integrasi notifikasi WhatsApp otomatis untuk sekolah.' },
    { id: 'PAKET_LENGKAP', name: 'PAKET LENGKAP', icon: 'Sparkles', order: 0.1, description: 'Solusi lengkap sekolah digital dengan harga hemat.' },
    { id: 'CORE', name: 'Core Platform', icon: 'Home', order: 6, description: 'Data master siswa, guru, dan administrasi akademik sekolah.' },
  ];

  for (const m of modulesToSeed) {
    await prisma.module.upsert({
      where: { id: m.id },
      update: { name: m.name, icon: m.icon, order: m.order, description: m.description, is_active: true },
      create: { id: m.id, name: m.name, icon: m.icon, order: m.order, description: m.description, is_active: true }
    });
  }

  // Cleanup old modules
  const allowedModuleIds = modulesToSeed.map(m => m.id);
  await prisma.module.updateMany({
    where: { id: { notIn: allowedModuleIds } },
    data: { is_active: false }
  });

  console.log('✅ Modules seeded and old modules deactivated.');

  // const toPlanCode = (name: string): string => {
  //   return String(name || '')
  //     .trim()
  //     .toUpperCase()
  //     .replace(/[^A-Z0-9]+/g, '_')
  //     .replace(/^_+|_+$/g, '');
  // };



  // 1. FREE TRIAL PLAN (The "Core" Plan)
  let freeTrialPlan = await prisma.plan.findFirst({ where: { name: 'CORE_PLATFORM' } });

  if (!freeTrialPlan) {
    freeTrialPlan = await prisma.plan.create({
      data: {
        code: 'CORE_PLATFORM',
        service_code: 'CORE',
        module_id: 'CORE',
        name: 'CORE_PLATFORM',
        price_monthly: 0,
        price_yearly: 0,
        max_user: null, // null means Unlimited
        features_json: [],
        trial_days: 0,
        description: 'Platform Dasar (GRATIS): Kelola Data Siswa (Tanpa Batas), Guru, dan Struktur Akademik. Tidak termasuk fitur Absensi, Inventory, dan Koperasi.',
        is_active: true,
        is_public: true,
        currency: 'IDR',
        billing_period: 'MONTH',
        absensi_mode: 'SIMPLE'
      }
    });
    console.log(`✅ Plan "CORE_PLATFORM" berhasil dibuat. ID: ${freeTrialPlan.id}`);
  } else {
    freeTrialPlan = await prisma.plan.update({
      where: { id: freeTrialPlan.id },
      data: {
        code: 'CORE_PLATFORM',
        service_code: 'CORE',
        module_id: 'CORE',
        price_monthly: 0,
        price_yearly: 0,
        max_user: null, // null means Unlimited
        features_json: [],
        trial_days: 0,
        description: 'Platform Dasar (GRATIS): Kelola Data Siswa (Tanpa Batas), Guru, dan Struktur Akademik. Tidak termasuk fitur Absensi, Keuangan, dan Koperasi.',
        is_active: true,
        is_public: true,
        absensi_mode: 'SIMPLE'
      }
    });
    console.log(`✅ Plan "CORE_PLATFORM" diperbarui. ID: ${freeTrialPlan.id}`);
  }

  // 1.2. SEED THE 5 FREE ACADEMIC PLANS
  const academicPlans = [
    {
      id: 'ACADEMIC_MICRO_TAHUNAN',
      code: 'ACADEMIC_MICRO_TAHUNAN',
      service_code: 'CORE',
      module_id: 'CORE',
      name: 'Academic Core (Micro) - Tahunan',
      price_monthly: 0,
      price_yearly: 0,
      max_user: 100,
      features_json: [],
      description: 'Platform Dasar gratis kapasitas Micro (Maks. 100 Siswa Aktif)',
      is_active: true,
      is_public: true,
      currency: 'IDR',
      billing_period: 'YEAR' as any,
      absensi_mode: 'SIMPLE' as any,
      size_label: 'Micro',
      tier: 'BASIC'
    },
    {
      id: 'ACADEMIC_SMALL_TAHUNAN',
      code: 'ACADEMIC_SMALL_TAHUNAN',
      service_code: 'CORE',
      module_id: 'CORE',
      name: 'Academic Core (Small) - Tahunan',
      price_monthly: 0,
      price_yearly: 0,
      max_user: 300,
      features_json: [],
      description: 'Platform Dasar gratis kapasitas Small (Maks. 300 Siswa Aktif)',
      is_active: true,
      is_public: true,
      currency: 'IDR',
      billing_period: 'YEAR' as any,
      absensi_mode: 'SIMPLE' as any,
      size_label: 'Small',
      tier: 'BASIC'
    },
    {
      id: 'ACADEMIC_MEDIUM_TAHUNAN',
      code: 'ACADEMIC_MEDIUM_TAHUNAN',
      service_code: 'CORE',
      module_id: 'CORE',
      name: 'Academic Core (Medium) - Tahunan',
      price_monthly: 0,
      price_yearly: 0,
      max_user: 600,
      features_json: [],
      description: 'Platform Dasar gratis kapasitas Medium (Maks. 600 Siswa Aktif)',
      is_active: true,
      is_public: true,
      currency: 'IDR',
      billing_period: 'YEAR' as any,
      absensi_mode: 'SIMPLE' as any,
      size_label: 'Medium',
      tier: 'STANDARD'
    },
    {
      id: 'ACADEMIC_LARGE_TAHUNAN',
      code: 'ACADEMIC_LARGE_TAHUNAN',
      service_code: 'CORE',
      module_id: 'CORE',
      name: 'Academic Core (Large) - Tahunan',
      price_monthly: 0,
      price_yearly: 0,
      max_user: 1200,
      features_json: [],
      description: 'Platform Dasar gratis kapasitas Large (Maks. 1200 Siswa Aktif)',
      is_active: true,
      is_public: true,
      currency: 'IDR',
      billing_period: 'YEAR' as any,
      absensi_mode: 'SIMPLE' as any,
      size_label: 'Large',
      tier: 'ENTERPRISE'
    },
    {
      id: 'ACADEMIC_ENTERPRISE_TAHUNAN',
      code: 'ACADEMIC_ENTERPRISE_TAHUNAN',
      service_code: 'CORE',
      module_id: 'CORE',
      name: 'Academic Core (Enterprise) - Tahunan',
      price_monthly: 0,
      price_yearly: 0,
      max_user: null,
      features_json: [],
      description: 'Platform Dasar gratis kapasitas Enterprise (Tanpa Batasan Siswa)',
      is_active: true,
      is_public: true,
      currency: 'IDR',
      billing_period: 'YEAR' as any,
      absensi_mode: 'SIMPLE' as any,
      size_label: 'Enterprise',
      tier: 'ULTIMATE'
    }
  ];

  for (const plan of academicPlans) {
    const existing = await prisma.plan.findUnique({ where: { id: plan.id } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
      console.log(`✅ Plan "${plan.id}" berhasil dibuat.`);
    } else {
      await prisma.plan.update({
        where: { id: plan.id },
        data: plan
      });
      console.log(`✅ Plan "${plan.id}" berhasil diperbarui.`);
    }
  }

  console.log('ℹ️ Seeding untuk katalog Plan Premium dilewati. Plan Premium sekarang dikelola secara terpusat oleh License Server.');

  // 8️⃣ Seed Struktur Organisasi (System Tenant + All Active Tenants)
  console.log('🌱 Seeding Struktur Organisasi for all active tenants...');
  const isProduction = process.env.NODE_ENV === 'production' || process.env.DEPLOY_SCENARIO === 'production' || process.env.SKIP_DUMMY_SEED === 'true';
  
  let devTenant = null;
  if (!isProduction) {
    const devTenantSubdomain = 'smkn1cimahi';
    devTenant = await prisma.tenant.findFirst({ where: { subdomain: devTenantSubdomain } });

    if (!devTenant) {
      console.log(`🌱 Creating Development Tenant: ${devTenantSubdomain}...`);
      devTenant = await prisma.tenant.create({
        data: {
          name: 'SMK Negeri 1 Cimahi',
          subdomain: devTenantSubdomain,
          status: 'ACTIVE',
          absensi_mode: 'MULTI_SESI',
          jam_masuk_default: '07:00',
          jam_pulang_default: '15:00',
          toleransi_keterlambatan_menit: 15,
        }
      });
    }
  }

  const allTenants = await prisma.tenant.findMany({ where: { status: 'ACTIVE' } });

  for (const tenant of allTenants) {
    await strukturOrganisasiService.initializeTenant(tenant.id);
    await seedDefaultJenisKegiatanForTenant(tenant.id);
  }
  console.log(`✅ Struktur Organisasi & Jenis Kegiatan seeded for ${allTenants.length} tenants.`);

  console.log('🔐 Menjalankan Policy Engine seeding (Fase B: Permission & StrukturPermission)...');
  console.log('✅ Policy Engine seeding (Fase B) selesai.');

  // 9️⃣ Seed Dummy Core & Cooperative Data (Hanya untuk Tenant Development/Test)
  // Ensure Subscription to CORE_PLATFORM (Only CORE features)
  const platformPlan = await prisma.plan.findFirst({ where: { name: 'CORE_PLATFORM' } });
  if (platformPlan && devTenant) {
    const activeSub = await prisma.subscription.findFirst({
      where: { tenant_id: devTenant.id, status: 'ACTIVE' }
    });

    // If subscription exists but not CORE_PLATFORM, update it? 
    // Or just ensure if no subscription exists.
    // For seed stability, let's update if exists or create if not.

    if (activeSub) {
      if (activeSub.plan_id !== platformPlan.id) {
        console.log(`🔄 Updating Subscription for ${devTenant.name} to ${platformPlan.name}...`);
        await prisma.subscription.update({
          where: { id: activeSub.id },
          data: { plan_id: platformPlan.id, service_code: (platformPlan as any).service_code || 'CORE' }
        });
      }
    }
  }


  if (devTenant) {
    console.log(`🌱 Seeding Data Koperasi & Core untuk Tenant Dev: ${devTenant.name}`);

    // 9a. Create Custom Admin User
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN', tenant_id: null } });
    if (adminRole) {
      const adminEmail = 'cimahi@gmail.com';
      const adminPassword = await bcrypt.hash('admin1234', 10);

      await prisma.user.upsert({
        where: {
          tenant_id_email: {
            tenant_id: devTenant.id,
            email: adminEmail
          }
        },
        update: {
          password: adminPassword,
          role_id: adminRole.id,
          status: 'ACTIVE'
        },
        create: {
          tenant_id: devTenant.id,
          email: adminEmail,
          password: adminPassword,
          full_name: 'Admin SMKN 1 Cimahi',
          role_id: adminRole.id,
          status: 'ACTIVE',
          email_verified: true,
          has_completed_onboarding: true
        }
      });
      console.log(`✅ Admin User created: ${adminEmail} (password: admin1234)`);
    }

    // Seed Core (Siswa/Guru)
    await seedCore(devTenant.id);

    // Ambil guru yang baru di-seed
    const guruList = await prisma.guru.findMany({ where: { tenant_id: devTenant.id } });

    // Seed Cooperative (Member linked to Core)
    const fetchedSiswaList = await prisma.siswa.findMany({ where: { tenant_id: devTenant.id } });

    await seedCooperative(devTenant.id, fetchedSiswaList, guruList);
  }

  // 10️⃣ Seed Jobdesk Dasar (Roles & Positions)
  await seedJobdesk();

  // 11️⃣ Seed Sarpras Global Catalog
  await seedSarprasCatalog(prisma);

  // 12️⃣ Seed Global Mapel Presets
  await seedMapelPresets(prisma);

  // 13️⃣ Seed Global Kurikulum Standards (Permendikbud 12/2024)
  await seedKurikulumStandards(prisma);

  // 14️⃣ Seed Global Program & Jurusan Presets
  await seedJurusanPresets(prisma);

  // 15️⃣ Seed Global Calendar Event Presets
  await seedCalendarPresets(prisma);

  console.log('✨ Seed selesai!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
