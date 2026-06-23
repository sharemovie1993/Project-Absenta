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
import { strukturOrganisasiService } from '../../modules/academic/struktur-organisasi/services/struktur-organisasi.service';

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
    // --- AKADEMIK ---
    {
      label: 'AKADEMIK', icon: 'GraduationCap', path: null, required_features: ['CORE'], order: 10, children: [
        {
          label: 'Kelompok Master', icon: 'Database', path: null, children: [
            { label: 'Tahun Pelajaran', icon: 'Calendar', path: '/academic/tahun-pelajaran', required_capability: 'academic.years.view.list' },
            { label: 'Semester', icon: 'Clock', path: '/academic/semester', required_capability: 'academic.semesters.view.list' },
            { label: 'Jurusan', icon: 'Briefcase', path: '/academic/jurusan', required_capability: 'academic.structures.view.list' },
            { label: 'Kelas', icon: 'Users', path: '/academic/kelas', required_capability: 'academic.structures.view.list' },
            { label: 'Mata Pelajaran', icon: 'BookOpen', path: '/academic/mapel', required_capability: 'academic.subjects.view.list' },
            { label: 'Guru', icon: 'UserCog', path: '/academic/guru', required_capability: 'academic.teachers.view.list' },
            { label: 'Siswa', icon: 'GraduationCap', path: '/academic/siswa', required_capability: 'academic.students.view.list' },
          ]
        },
        {
          label: 'Kelompok Setup', icon: 'Settings', path: null, children: [
            { label: 'Registrasi Siswa', icon: 'UserPlus', path: '/academic/registrasi-siswa', required_capability: 'academic.students.create' },
            { label: 'Wali Kelas', icon: 'UserCheck', path: '/academic/wali-kelas', required_capability: 'academic.homeroom.manage' },
            { label: 'Guru Mapel', icon: 'ListChecks', path: '/academic/guru-mapel', required_capability: 'academic.teaching.manage' },
            { label: 'Jenis Kegiatan', icon: 'Activity', path: '/academic/jenis-kegiatan', required_capability: 'academic.activities.types.manage' },
            { label: 'Transition', icon: 'Move', path: '/academic/transition', required_capability: 'academic.transitions.manage' },
            { label: 'Siswa Cards', icon: 'Contact', path: '/academic/siswa-cards', required_capability: 'academic.manage.siswa' },
            { label: 'Mutation', icon: 'UserMinus', path: '/academic/mutation', required_capability: 'academic.manage.siswa' },
            { label: 'Struktur Organisasi', icon: 'Network', path: '/academic/struktur-organisasi', required_capability: 'academic.structures.view.list' },
            { label: 'Backup', icon: 'Database', path: '/academic/backup', required_capability: 'academic.backups.create' },
          ]
        },
        {
          label: 'KURIKULUM', icon: 'Layout', path: null, children: [
            { label: 'Supervisi Guru', icon: 'ShieldCheck', path: '/kurikulum/supervisi', required_capability: 'curriculum.supervision.view.schedule' },
            { label: 'Struktur Kurikulum', icon: 'Layout', path: '/kurikulum/struktur', required_capability: 'curriculum.structure.manage' },
            { label: 'Jadwal Pelajaran', icon: 'CalendarDays', path: '/kurikulum/jadwal', required_capability: 'attendance.schedules.view.list' },
          ]
        },
        {
          label: 'KESISWAAN', icon: 'Users', path: null, children: [
            { label: 'Piket & Izin Keluar', icon: 'ClipboardCheck', path: '/kesiswaan/piket', required_capability: 'attendance.piket.view' },
            { label: 'Pelanggaran', icon: 'AlertTriangle', path: '/kesiswaan/pelanggaran', required_capability: 'affairs.violations.view.list' },
            { label: 'Jenis Pelanggaran', icon: 'List', path: '/kesiswaan/jenis-pelanggaran', required_capability: 'affairs.violation.types.view.list' },
            { label: 'Monitoring Kesiswaan', icon: 'Activity', path: '/kesiswaan/monitoring', required_capability: 'dashboard.view.violation.stats' },
            { label: 'Bimbingan Konseling (BK)', icon: 'HeartHandshake', path: '/kesiswaan/bk', required_capability: 'affairs.violations.view.list' },
          ]
        }
      ]
    },

    // --- ABSENSI ---
    {
      label: 'ABSENSI', icon: 'Clock', path: null, required_features: ['ABSENSI'], order: 20, children: [
        {
          label: 'Kelompok Setup', icon: 'Settings', path: null, children: [
            { label: 'Settings', icon: 'Settings', path: '/attendance/settings', required_capability: 'attendance.manage.session' },
            { label: 'Jadwal Template', icon: 'Calendar', path: '/attendance/jadwal-template', required_capability: 'attendance.schedules.view.list' },
            { label: 'Petugas', icon: 'UserCheck', path: '/attendance/petugas', required_capability: 'attendance.manage.petugas' },
            { label: 'Devices', icon: 'Cpu', path: '/attendance/devices', required_capability: 'attendance.manage.session' },
            { label: 'Rekam Wajah', icon: 'Camera', path: '/attendance/rekam-wajah', required_capability: 'attendance.manage.face.templates' },
          ]
        },
        {
          label: 'Kelompok Process', icon: 'Activity', path: null, children: [
            { label: 'Ops Gerbang', icon: 'Scan', path: '/attendance/ops', required_capability: 'attendance.gate.tap.entry' },
            { label: 'Input Absensi', icon: 'ClipboardCheck', path: '/attendance/ops', required_capability: 'attendance.sessions.create' },
            { label: 'Jurnal Kelas', icon: 'FileText', path: '/attendance/riwayat-ajar', required_capability: 'attendance.sessions.update.journal' },
            { label: 'Guru Monitoring', icon: 'Monitor', path: '/attendance/guru-monitoring', required_capability: 'attendance.monitoring.view.live.status' },
            { label: 'Riwayat Ajar', icon: 'History', path: '/attendance/riwayat-ajar', required_capability: 'academic.teaching.view' },
            { label: 'Monitoring KBM', icon: 'Activity', path: '/attendance/monitoring', required_capability: 'attendance.monitoring.view.live.status' },
            { label: 'My Attendance', icon: 'User', path: '/attendance/my-attendance', required_capability: 'attendance.sessions.view.list' },
          ]
        },
        {
          label: 'Kelompok Laporan', icon: 'FilePieChart', path: null, children: [
            { label: 'Rekap Siswa Harian', icon: 'Calendar', path: '/attendance/rekap/siswa-harian', required_capability: 'attendance.recap.view.daily' },
            { label: 'Rekap Siswa Bulanan', icon: 'CalendarCheck', path: '/attendance/rekap/siswa-bulanan', required_capability: 'attendance.recap.view.monthly' },
            { label: 'Rekap Kelas Bulanan', icon: 'Users', path: '/attendance/rekap/kelas-bulanan', required_capability: 'attendance.recap.view.global' },
            { label: 'Tracking Siswa', icon: 'MapPin', path: '/attendance/tracking-siswa', required_capability: 'attendance.recap.view.global' },
          ]
        }
      ]
    },

    // --- HUBIN ---
    {
      label: 'HUBIN', icon: 'Handshake', path: null, required_features: ['HUBIN'], order: 30, children: [
        { label: 'Mitra Industri', icon: 'Store', path: '/hubin/mitra', required_capability: 'hubin.partners.manage, hubin.pkl.view.list' },
        { label: 'Penempatan PKL', icon: 'UserPlus', path: '/hubin/penempatan', required_capability: 'hubin.pkl.view.list, hubin.guidance.manage' },
        { label: 'Presensi & Jurnal PKL', icon: 'Briefcase', path: '/hubin/absensi', required_capability: 'hubin.view.pkl' },
        { label: 'Verifikasi Absensi', icon: 'CalendarCheck', path: '/hubin/absensi', required_capability: 'hubin.absensi.verify' },
        { label: 'Monitoring PKL', icon: 'Activity', path: '/hubin/monitoring', required_capability: 'hubin.absensi.recap, hubin.absensi.view.history' },
      ]
    },

    // --- SARPRAS ---
    {
      label: 'SARPRAS', icon: 'Package', path: null, required_features: ['SARPRAS'], order: 35, children: [
        { label: 'Inventory Aset', icon: 'Archive', path: '/sarpras/inventory', required_capability: 'sarpras.inventory.view.list' },
        { label: 'Peminjaman', icon: 'ArrowUpCircle', path: '/sarpras/loans', required_capability: 'sarpras.loans.view.list' },
        { label: 'Pemeliharaan', icon: 'Tool', path: '/sarpras/maintenance', required_capability: 'sarpras.repairs.view.list' },
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
          required_capability: 'cooperative.members.view.list, cooperative.savings.deposit, cooperative.store.orders.manage, cooperative.reports.view.financial, cooperative.loans.approve, cooperative.announcements.create, cooperative.shu.view.report, cooperative.tickets.view.list',
          children: [
            { label: 'Manajemen Anggota', icon: 'Users', path: '/cooperative/members', required_capability: 'cooperative.members.view.list' },
            { label: 'Input Simpanan', icon: 'PlusCircle', path: '/cooperative/savings/manage', required_capability: 'cooperative.savings.deposit' },
            { label: 'Persetujuan Pinjaman', icon: 'CheckCircle', path: '/cooperative/loans/manage', required_capability: 'cooperative.loans.approve' },
            { label: 'PPOB Admin', icon: 'Zap', path: '/cooperative/ppob', required_capability: 'cooperative.ppob.manage.products' },
            { label: 'Pengumuman Koperasi', icon: 'Bell', path: '/cooperative/announcements', required_capability: 'cooperative.announcements.create' },
            { label: 'Laporan Keuangan', icon: 'FilePieChart', path: '/cooperative/reports', required_capability: 'cooperative.reports.view.financial' },
            { label: 'Manajemen SHU', icon: 'Award', path: '/cooperative/shu/manage', required_capability: 'cooperative.shu.view.report' },
            { label: 'Daftar Keluhan', icon: 'MessageSquare', path: '/cooperative/tickets/manage', required_capability: 'cooperative.tickets.view.list' },
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

  const toPlanCode = (name: string): string => {
    return String(name || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };



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

  console.log('🌱 Generating Unified Plan Definitions...');

  const MODULE_BLUEPRINTS = {
    'ABSENSI-SIMPLE': [
      'Absensi Datang & Pulang (GPS/Radius)',
      'Face Recognition & Liveness Detection',
      'Persetujuan Izin & Cuti via App',
      'Notifikasi WhatsApp Otomatis ke Orang Tua',
      'Laporan Kehadiran Harian & Bulanan',
      'Manajemen Jam Kerja & Kalender Sekolah'
    ],
    'ABSENSI-MULTI_SESI': [
      'Absensi Per Mata Pelajaran (KBM)',
      'Jurnal Mengajar Guru Digital',
      'Monitoring KBM Real-time (Siswa Bolos)',
      'Notifikasi WhatsApp Per Jam Pelajaran',
      'Rekap Kehadiran Per Mapel & Guru',
      'Integrasi Jadwal Kurikulum Otomatis'
    ],
    'KOPERASI': [
      'Manajemen Anggota & Tabungan Siswa',
      'Sistem Pinjaman & Angsuran Otomatis',
      'Kasir / POS (Point of Sale) Koperasi',
      'Laporan Keuangan & SHU (Sisa Hasil Usaha)',
      'Manajemen Stok & Inventaris Toko',
      'PPOB (Pulsa, Listrik, Paket Data)'
    ],
    'SARPRAS': [
      'Manajemen Inventaris Aset Sekolah',
      'Sistem Peminjaman Ruang & Lab',
      'Monitoring Perbaikan & Maintenance',
      'Audit Aset Berbasis Lokasi (QR Code)',
      'Laporan Penyusutan Nilai Aset'
    ],
    'HUBIN': [
      'Manajemen Mitra Industri (DU/DI)',
      'Penempatan & Monitoring PKL Siswa',
      'Jurnal PKL Digital (Input di Lokasi)',
      'Absensi PKL Berbasis Geofencing',
      'Laporan Evaluasi Pembimbing Industri'
    ],
    'WHATSAPP': [
      'Notifikasi Kehadiran Otomatis (Real-time)',
      'Laporan Harian & Bulanan via WhatsApp',
      'Sistem Blast Pengumuman Seluruh Sekolah',
      'Integrasi Notifikasi Koperasi & Sarpras',
      'Dashboard Monitoring Status Pengiriman Pesan',
      'Support Custom API Gateway (Fonnte/WoWA/dll)'
    ],
    'PAKET_LENGKAP-SIMPLE': [
      'Akses Seluruh Modul (PAKET LENGKAP SIMPLE)',
      'Integrasi WhatsApp Notifikasi Otomatis',
      'Prioritas Dukungan Teknis 24/7',
      'Update Fitur Terbaru Secara Otomatis',
      'Backup Data Harian & Keamanan Berlapis'
    ],
    'PAKET_LENGKAP-MULTI_SESI': [
      'Akses Seluruh Modul (PAKET LENGKAP MULTI)',
      'Integrasi WhatsApp Notifikasi Otomatis',
      'Prioritas Dukungan Teknis 24/7',
      'Update Fitur Terbaru Secara Otomatis',
      'Backup Data Harian & Keamanan Berlapis'
    ],
    'CORE': [] // Core is basic, handled separately
  };

  const TIERS = [
    { label: 'Micro', max_user: 100, tier: 'BASIC' },
    { label: 'Small', max_user: 300, tier: 'BASIC' },
    { label: 'Medium', max_user: 600, tier: 'STANDARD' },
    { label: 'Large', max_user: 1200, tier: 'ENTERPRISE' },
    { label: 'Enterprise', max_user: null, tier: 'ULTIMATE' },
  ];

  const MODULE_CONFIGS = [
    { id: 'ABSENSI', name: 'Absensi Simple', mode: 'SIMPLE' },
    { id: 'ABSENSI', name: 'Absensi Multi Sesi', mode: 'MULTI_SESI' },
    { id: 'KOPERASI', name: 'Koperasi Sekolah', mode: 'SIMPLE' },
    { id: 'SARPRAS', name: 'Inventory Sekolah', mode: 'SIMPLE' },
    { id: 'HUBIN', name: 'Hubungan Industri', mode: 'SIMPLE' },
    { id: 'WHATSAPP', name: 'WhatsApp Service', mode: 'SIMPLE' },
    { id: 'PAKET_LENGKAP_SIMPLE', name: 'PAKET LENGKAP SIMPLE', mode: 'SIMPLE' },
    { id: 'PAKET_LENGKAP_MULTI', name: 'PAKET LENGKAP MULTI', mode: 'MULTI_SESI' },
  ];

  // MATRIKS HARGA (Monthly)
  const PRICING_MATRIX: Record<string, Record<string, number>> = {
    'ABSENSI-SIMPLE': {
      'Micro': 100000,
      'Small': 250000,
      'Medium': 450000,
      'Large': 750000,
      'Enterprise': 1500000
    },
    'ABSENSI-MULTI_SESI': {
      'Micro': 200000,
      'Small': 450000,
      'Medium': 750000,
      'Large': 1250000,
      'Enterprise': 2500000
    },
    'KOPERASI': {
      'Micro': 150000,
      'Small': 300000,
      'Medium': 500000,
      'Large': 850000,
      'Enterprise': 1750000
    },
    'SARPRAS': {
      'Micro': 25000,
      'Small': 50000,
      'Medium': 100000,
      'Large': 200000,
      'Enterprise': 350000
    },
    'HUBIN': {
      'Micro': 20000,
      'Small': 40000,
      'Medium': 75000,
      'Large': 150000,
      'Enterprise': 250000
    },
    'WHATSAPP': {
      'Micro': 20000,
      'Small': 40000,
      'Medium': 75000,
      'Large': 150000,
      'Enterprise': 250000
    },
    'PAKET_LENGKAP-SIMPLE': {
      'Micro': 199000,
      'Small': 499000,
      'Medium': 899000,
      'Large': 1599000,
      'Enterprise': 2999000
    },
    'PAKET_LENGKAP-MULTI_SESI': {
      'Micro': 299000,
      'Small': 599000,
      'Medium': 1099000,
      'Large': 1999000,
      'Enterprise': 3999000
    }
  };

  // 0️⃣ CLEANUP: Deactivate all old public plans to avoid clutter (e.g., 7 variations instead of 5)
  // We keep them in DB but hide them from public catalog.
  console.log('🧹 Deactivating old plans for a fresh catalog start...');
  await prisma.plan.updateMany({
    where: {
      code: { not: 'CORE_PLATFORM' },
      is_public: true
    },
    data: { is_active: false, is_public: false }
  });

  const seededPlans: Array<{ name: string; billing_period: 'MONTH' | 'YEAR'; price_monthly: number; price_yearly: number | null; max_user: number | null; }> = [];

  for (const mod of MODULE_CONFIGS) {
    const featureKey = mod.id === 'ABSENSI' ? `ABSENSI-${mod.mode}` : (mod.id.startsWith('PAKET_LENGKAP') ? `PAKET_LENGKAP-${mod.mode}` : mod.id);
    let features = MODULE_BLUEPRINTS[featureKey as keyof typeof MODULE_BLUEPRINTS] || [];

    // Auto-bundle features for Paket Lengkap
    if (mod.id.startsWith('PAKET_LENGKAP')) {
      const baseFeatures = ['KOPERASI', 'SARPRAS', 'HUBIN', 'WHATSAPP'];
      // Add specific attendance mode feature
      const attendanceFeature = `ABSENSI-${mod.mode}`;
      features = [...baseFeatures, attendanceFeature, ...features];
    }

    const modPrices = PRICING_MATRIX[featureKey] || {};

    for (const tier of TIERS) {
      const baseMonthlyPrice = modPrices[tier.label] || 0;
      // Hitung harga tahunan (Diskon 20% dari total 12 bulan -> bayar 9.6 bulan)
      const yearlyPrice = Math.round(baseMonthlyPrice * 12 * 0.8);

      // Loop untuk Monthly dan Yearly
      for (const billingPeriod of ['MONTH', 'YEAR'] as const) {
        const periodLabel = billingPeriod === 'YEAR' ? 'Tahunan' : 'Bulanan';
        const planName = `${mod.name} (${tier.label}) - ${periodLabel}`;
        const planCode = toPlanCode(planName);

        const data: Prisma.PlanCreateInput = {
          code: planCode,
          service_code: mod.id,
          Module: { connect: { id: mod.id.startsWith('PAKET_LENGKAP') ? 'PAKET_LENGKAP' : mod.id } },
          name: planName,
          size_label: tier.label,
          tier: tier.tier,
          description: `Solusi ${mod.name} skala ${tier.label}.`,
          price_monthly: billingPeriod === 'YEAR' ? Math.round(yearlyPrice / 12) : baseMonthlyPrice,
          price_yearly: yearlyPrice,
          billing_period: billingPeriod,
          max_user: tier.max_user,
          absensi_mode: mod.mode as any,
          features_json: features,
          is_active: true,
          is_public: true,
          currency: 'IDR',
        };

        const existing = await prisma.plan.findFirst({ where: { OR: [{ code: planCode }, { name: planName }] } });

        if (existing) {
          await prisma.plan.update({ where: { id: existing.id }, data: data as any });
        } else {
          await prisma.plan.create({ data: data as any });
        }

        seededPlans.push({
          name: planName,
          billing_period: billingPeriod,
          price_monthly: Number(data.price_monthly),
          price_yearly: Number(data.price_yearly),
          max_user: tier.max_user,
        });
      }
    }
  }
  console.log(`✅ Plans seeded. Total: ${seededPlans.length}`);

  // 8️⃣ Seed Struktur Organisasi (System Tenant + All Active Tenants)
  console.log('🌱 Seeding Struktur Organisasi for all active tenants...');
  const devTenantSubdomain = 'smkn1cimahi';
  let devTenant = await prisma.tenant.findFirst({ where: { domain: devTenantSubdomain } });

  if (!devTenant) {
    console.log(`🌱 Creating Development Tenant: ${devTenantSubdomain}...`);
    devTenant = await prisma.tenant.create({
      data: {
        name: 'SMK Negeri 1 Cimahi',
        domain: devTenantSubdomain,
        status: 'ACTIVE',
        absensi_mode: 'MULTI_SESI',
        jam_masuk_default: '07:00',
        jam_pulang_default: '15:00',
        toleransi_keterlambatan_menit: 15,
      }
    });
  }

  const allTenants = await prisma.tenant.findMany({ where: { status: 'ACTIVE' } });

  for (const tenant of allTenants) {
    await strukturOrganisasiService.initializeTenant(tenant.id);
  }
  console.log(`✅ Struktur Organisasi seeded for ${allTenants.length} tenants.`);

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
