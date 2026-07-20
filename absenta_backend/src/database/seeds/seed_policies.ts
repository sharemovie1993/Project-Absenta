
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { CAPABILITY_DOMAIN_MAP } from '../../config/capability-domains.generated';
import { strukturOrganisasiService } from '../../modules/academic/struktur-organisasi/services/struktur-organisasi.service';

const prisma = new PrismaClient();

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((v) => String(v).trim()).filter(Boolean)));
}

function domainOf(capability: string): string {
  const d = (CAPABILITY_DOMAIN_MAP as any)[capability] as string | undefined;
  if (!d) {
    // Robust fallback for virtual/internal scoping capabilities
    if (capability.startsWith('organization.scope.')) return 'ORGANIZATIONAL';
    if (capability.startsWith('dashboard.')) return 'TENANT';
    return 'TENANT'; // Default fallback instead of crashing
  }
  return d;
}

function buildRoleBaselines(allPermissionIds: string[]): Record<string, string[]> {
  const guru = uniqueStrings([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'academic.teachers.view.list',
    'academic.teachers.view.detail',
    'organization.scope.teaching_restricted',
    'academic.teaching.view',
    'academic.teaching.rekap',
    'academic.years.view.list',
    'academic.semesters.view.list',
    'academic.subjects.view.list',
    'academic.structures.view.list',
    'academic.structures.view.detail',
    'academic.structures.view.tree',
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.view.kelas',
    'academic.view.mapel',
    'attendance.reports.view',
    'academic.schedules.view.list',
    'kesiswaan.schedules.view.list',
    'attendance.schedules.view.list',
    'attendance.sessions.view.detail',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'attendance.recap.view.global',
    'attendance.monitoring.view.live.status',
    'documents.upload',
    'documents.view.list',
    'notify.check.status',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'reports.attendance.view',
    'attendance.sessions.view.list',
    'attendance.sessions.update.attendance',
    'attendance.sessions.tap',
    'attendance.sessions.update.journal',
    'dashboard.view.teacher.attendance',
    'dashboard.view.guru',
    'core.tenants.view.detail',
    'billing.my.subscription.view',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list',
    'cooperative.savings.view.history',
    'cooperative.points.view',
    'cooperative.store.view.catalog',
    'cooperative.loans.apply',
    'cooperative.tickets.create',
    'cooperative.tickets.reply',
    'cooperative.tickets.view.detail',
    'affairs.violations.report',
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'kesiswaan.prestasi.view',
    'hubin.guidance.manage',
    'hubin.logbook.manage',
    'sarpras.loans.view.list',
    'sarpras.loans.request',
    'correspondence.inbox.view',
    'correspondence.outbox.view',
    'academic.manage.kbm',
  ]);

  const siswa = uniqueStrings([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'core.tenants.view.detail',
    'dashboard.view.overview',
    'academic.years.view.list',
    'academic.semesters.view.list',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'attendance.recap.view.tracking',
    'attendance.reports.view',
    'academic.structures.view.list',
    'academic.structures.view.detail',
    'academic.structures.view.tree',
    'academic.schedules.view.list',
    'kesiswaan.schedules.view.list',
    'attendance.schedules.view.list',
    'attendance.officers.view',
    'attendance.sessions.view.list',
    'attendance.sessions.view.detail',
    'attendance.student.view.stats',
    'documents.view.list',
    'documents.upload',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'cooperative.announcements.view.list',
    'hubin.self.pkl',
    'hubin.self.logbook',
    'hubin.self.tracer',
    'hubin.self.bkk',
    'affairs.violations.view.list',
    'affairs.violations.view.detail',
    'affairs.violation.types.view.list', // Tambahan: Agar siswa bisa melihat jenis pelanggaran
    'dashboard.view.siswa',
    'billing.my.subscription.view',
    'cooperative.dashboard.view.overview',
    'cooperative.savings.view.history',
    'cooperative.points.view',
    'cooperative.store.view.catalog',
    'cooperative.loans.apply',
    'cooperative.tickets.create',
    'cooperative.tickets.reply',
    'cooperative.tickets.view.detail',
    'sarpras.loans.view.list',
    'sarpras.loans.request',
  ]);

  const anggotaKoperasiExternal = uniqueStrings([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'cooperative.dashboard.view.overview',
    'cooperative.announcements.view.list',
    'cooperative.savings.view.history',
    'cooperative.points.view',
    'cooperative.store.view.catalog',
    'cooperative.loans.apply',
    'cooperative.tickets.create',
    'cooperative.tickets.reply',
    'cooperative.tickets.view.detail',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'documents.view.list',
  ]);

  const superadmin = uniqueStrings(
    allPermissionIds.filter((id) => {
      const d = domainOf(id);
      return d === 'PLATFORM' || d === 'SHARED';
    })
  );

  const platformFinance = uniqueStrings([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'notify.check.status',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'billing.manage.billings',
    'billing.manage.plans',
    'billing.manage.subscriptions',
    // Plans capabilities
    'billing.plans.create',
    'billing.plans.delete',
    'billing.plans.update',
    'billing.plans.view.detail',
    'billing.plans.view.list',
    // Subscriptions capabilities
    'billing.subscriptions.view.active',
    'billing.subscriptions.update',
    'billing.subscriptions.view.list',
    'billing.subscriptions.view.detail',
    'billing.subscriptions.create',
    'billing.subscriptions.cancel',
    'billing.subscriptions.resume',
    'billing.subscriptions.renew',
    'billing.subscriptions.check.expired',
    'billing.subscriptions.view.analytics',
    'billing.subscriptions.choose.plan',
    'billing.subscriptions.upgrade.cancel',
    'billing.subscriptions.upgrade.wizard',
    // Invoices capabilities
    'billing.invoices.view.list',
    'billing.invoices.view.detail',
    'billing.invoices.view',
    'billing.invoices.generate',
    'billing.invoices.pay',
    'billing.invoices.cancel',
    'billing.invoices.delete',
    'billing.invoices.send',
    'billing.invoices.update',
    'billing.invoices.public.link.delete',
    // Payments capabilities
    'billing.payments.view.history',
    'billing.payments.create',
    'billing.payments.view.status',
    'billing.payments.cancel',
    'billing.payments.retry',
    'billing.payments.delete',
    // My subscription (backward support)
    'billing.my.subscription.view',
    'billing.my.subscription.create',
    'billing.my.subscription.upgrade',
    // Reports and platform settings
    'billing.reports.view.summary',
    'core.system.config.view',
    'core.system.config.update',
    'billing.monitoring.view.live.status',
    'billing.billings.view.list',
    'billing.billings.view.detail',
    'core.tenants.view.list',
    'core.tenants.view.detail',
    'superadmin.revenue.view.overview',
    'payments.test.simulate',
  ]);

  const platformSupport = uniqueStrings([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'notify.check.status',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'core.tenants.view.list',
    'core.tenants.view.detail',
    'core.tenants.update',
    'superadmin.tenants.manage',
    'superadmin.tenants.impersonate',
    'platform.tenants.view.list',
    'superadmin.upgrade.intelligence.view',
    'superadmin.risk.view',
    'superadmin.platform.intelligence.view',
    'core.users.view.list',
    'core.users.reset.password',
    'billing.subscriptions.view.list',
    'billing.subscriptions.view.detail',
    'billing.subscriptions.view.active',
    'billing.subscriptions.view.analytics',
    'billing.plans.view.list',
    'billing.plans.view.detail',
    'billing.invoices.view.list',
    'billing.invoices.view.detail',
    'billing.invoices.view',
    'billing.payments.view.history',
    'billing.payments.view.status',
    'core.system.config.view',
    'billing.monitoring.view.live.status',
    'billing.billings.view.list',
    'billing.billings.view.detail',
    'superadmin.analytics.view',
    'admin.tickets.view.list',
    'admin.tickets.view.detail',
    'admin.tickets.manage.assign',
    'admin.tickets.manage.status',
    'admin.tickets.reply',
  ]);

  const platformInfrastructure = uniqueStrings([
    'core.auth.logout',
    'core.sekolah.view.profile',
    'dashboard.view.overview',
    'notify.check.status',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'superadmin.infra.monitoring.view',
    'superadmin.infra.view.socket.global',
    'superadmin.infra.view.socket.tenants',
    'system.workers.view',
    'system.health.view',
    'system.logs.view',
    'system.feature.flags.manage',
    'core.tenants.view.list',
    'cadangan.view.cadangan',
    'academic.backups.view.list',
    'academic.backups.create',
  ]);

  const admin = uniqueStrings([
    'academic.manage.academic',
    'academic.students.view.list',
    'academic.students.view.detail',
    'academic.students.view.history',
    'academic.students.create',
    'academic.students.update',
    'academic.students.delete',
    'academic.students.send.access.token',
    'academic.teachers.view.list',
    'academic.teachers.view.detail',
    'academic.manage.guru',
    'academic.teachers.create',
    'academic.teachers.update',
    'academic.teachers.delete',
    'academic.structures.view.list',
    'academic.structures.view.detail',
    'academic.structures.view.tree',
    'academic.structure.manage',
    'academic.manage.kelas',
    'academic.structures.create',
    'academic.structures.update',
    'academic.structures.delete',
    'academic.structures.assign.student',
    'academic.structures.assign.teacher',
    'academic.structures.revoke.student',
    'academic.structures.revoke.teacher',
    'academic.activities.view.list',
    'academic.activities.create',
    'academic.activities.update',
    'academic.activities.delete',
    'academic.years.view.list',
    'academic.years.view.detail',
    'academic.manage.tahun.pelajaran',
    'academic.years.create',
    'academic.years.update',
    'academic.years.delete',
    'academic.years.set.active',
    'academic.semesters.view.list',
    'academic.semesters.view.detail',
    'academic.manage.semester',
    'academic.semesters.create',
    'academic.semesters.update',
    'academic.semesters.delete',
    'academic.semesters.set.active',
    'academic.teaching.view',
    'academic.teaching.manage',
    'academic.teaching.rekap',
    'academic.promotions.manage',
    'academic.transitions.manage',
    'academic.homeroom.manage',
    'academic.activities.types.view',
    'academic.activities.types.manage',
    'academic.subjects.view.list',
    'academic.subjects.view.detail',
    'academic.manage.mapel',
    'academic.subjects.create',
    'academic.subjects.update',
    'academic.subjects.delete',
    'academic.backups.view.list',
    'academic.backups.create',
    'academic.backups.restore',
    'academic.student.card.view.config',
    'academic.student.card.update.config',
    'attendance.gate.bypass',
    'attendance.recap.view.daily',
    'attendance.recap.view.monthly',
    'attendance.recap.view.global',
    'attendance.gate.view.logs',
    'attendance.gate.view.face.templates',
    'attendance.officers.view',
    'attendance.officers.manage',
    'attendance.sessions.create',
    'attendance.sessions.view.list',
    'attendance.sessions.view.detail',
    'attendance.sessions.update.attendance',
    'attendance.sessions.close',
    'attendance.sessions.delete',
    'attendance.reports.view',
    'academic.schedules.create',
    'academic.schedules.update',
    'academic.schedules.delete',
    'academic.schedules.view.list',
    'academic.schedules.manage',
    'kesiswaan.schedules.create',
    'kesiswaan.schedules.update',
    'kesiswaan.schedules.delete',
    'kesiswaan.schedules.view.list',
    'attendance.schedules.create',
    'attendance.schedules.update',
    'attendance.schedules.delete',
    'attendance.schedules.view.list',
    'attendance.manage.session',
    'attendance.manage.petugas',
    'attendance.manage.face.templates',
    'attendance.monitoring.view.live.status',
    'attendance.gate.tap.entry',
    'attendance.events.view.list',
    'attendance.events.create',
    'attendance.events.delete',
    'documents.view.list',
    'documents.view.detail',
    'documents.upload',
    'documents.delete',
    'dashboard.view.overview',
    'dashboard.view.teacher.attendance',
    'dashboard.view.student.stats',
    'dashboard.view.violation.stats',
    'notify.check.status',
    'notify.view.my',
    'notify.view.preferences',
    'notify.update.preferences',
    'notify.view.stats',
    'notify.push.view.subscriptions',
    'notify.view.logs',
    'notify.resend',
    'notify.send.test.email',
    'notify.send.test.whatsapp',
    'core.users.view.list',
    'core.users.view.detail',
    'core.users.view.roles',
    'core.users.create',
    'core.users.update',
    'core.users.delete',
    'core.users.complete.onboarding',
    'core.users.update.email',
    'core.users.reset.password',
    'core.users.permissions.view',
    'core.users.effective.capabilities.view',
    'core.users.roles.create',
    'core.users.roles.update',
    'core.users.roles.delete',
    'core.users.roles.permissions.update',
    'core.menu.roles.update',
    'core.system.config.view',
    'core.system.config.update',
    'core.sekolah.view.profile',
    'core.sekolah.update.profile',
    'billing.my.subscription.view',
    'billing.my.subscription.create',
    'billing.my.subscription.upgrade',
    'billing.invoices.view.list',
    'billing.invoices.view.detail',
    'billing.invoices.generate',
    'billing.invoices.pay',
    'billing.invoices.cancel',
    'billing.subscriptions.view.active',
    'billing.subscriptions.view.available',
    'billing.subscriptions.create',
    'billing.subscriptions.update',
    'billing.subscriptions.cancel',
    'billing.payments.view.history',
    'billing.payments.create',
    'billing.payments.view.status',
    'billing.payments.cancel',
    'billing.payments.retry',
    'billing.payments.delete',
    'payments.test.simulate',
    'core.tenants.view.list',
    'core.tenants.view.detail',
    // Additional Hubs Capabilities
    'curriculum.supervision.view.schedule',
    'curriculum.supervision.create.record',
    'curriculum.supervision.update.record',
    'curriculum.supervision.delete.record',
    'curriculum.supervision.view.report',
    'curriculum.supervision.manage',
    'reports.violation.view',
    'dashboard.view.kesiswaan',
    'hubin.partners.manage',
    'hubin.mou.manage',
    'hubin.mou.view.list',
    'hubin.pkl.manage',
    'hubin.pkl.view.list',
    'hubin.absensi.recap',
    'hubin.absensi.view.history',
    'hubin.absensi.verify',
    'hubin.logbook.manage',
    'hubin.guidance.manage',
    'hubin.tefa.manage',
    'hubin.bkk.manage',
    'hubin.lamaran.manage',
    'hubin.tracer.view',
    'dashboard.view.hubin',
    'support.tickets.create',
    'support.tickets.view',
    'support.tickets.reply',
    'support.tickets.resolve',
    'dashboard.view.sarpras',
    'sarpras.inventory.view.list',
    'sarpras.inventory.manage',
    'sarpras.categories.manage',
    'sarpras.locations.manage',
    'sarpras.loans.view.list',
    'sarpras.loans.manage',
    'sarpras.loans.request',
    'sarpras.repairs.view.list',
    'sarpras.repairs.manage',
    'academic.manage.wali.kelas',
    'academic.manage.siswa',
    'academic.transitions.manage',
    'affairs.violation.types.create',
    'affairs.violation.types.delete',
    'affairs.violation.types.update',
    'affairs.violation.types.manage',
    'affairs.violation.types.view.list',
    'affairs.violations.delete',
    'affairs.violations.report',
    'affairs.violations.update',
    'affairs.violations.view.detail',
    'affairs.violations.view.list',
    'whatsapp.manage.config',
    'whatsapp.send.test',
    'support.tickets.create',
    'support.tickets.view',
    'support.tickets.reply',
    'support.tickets.resolve',
    'attendance.piket.manage',
    'attendance.piket.view',
    'kesiswaan.dashboard.view',
    'kesiswaan.pelanggaran.view',
    'kesiswaan.pelanggaran.manage',
    'kesiswaan.prestasi.view',
    'kesiswaan.prestasi.manage',
    'kesiswaan.piket.view',
    'kesiswaan.piket.manage',
    'kesiswaan.kegiatan.view',
    'kesiswaan.kegiatan.manage',
    'reports.hubin.view',
    'bk.cases.view.list',
    'bk.cases.view.detail',
    'bk.cases.manage',
    'bk.counseling.manage',
    'bk.counseling.view.sensitive',
    'bk.summons.manage',
    'bk.homevisit.manage',
    'bk.assessment.manage',
    'bk.referrals.manage',
    'bk.reports.view',
    'correspondence.inbox.view',
    'correspondence.inbox.manage',
    'correspondence.outbox.view',
    'correspondence.outbox.manage',
    'correspondence.outbox.sign',
  ].concat(allPermissionIds.filter(id => id.startsWith('cooperative.'))));

  const ensureNoOrganizationalInBaseline = (role: string, baseline: string[]) => {
    const violating = baseline.filter((id) => {
      // Allow specific features as baseline even if they are marked ORGANIZATIONAL in catalog
      if ((role === 'GURU' || role === 'SISWA') && (
        id.startsWith('academic.schedules.') ||
        id.startsWith('kesiswaan.schedules.') ||
        id.startsWith('attendance.schedules.') ||
        id.startsWith('attendance.sessions.') ||
        id.startsWith('attendance.officers.') ||
        id.startsWith('affairs.violations.') || 
        id.startsWith('affairs.violation.types.') ||
        id.startsWith('hubin.') ||
        id.startsWith('kesiswaan.') ||
        id.startsWith('correspondence.') ||
        id === 'sarpras.loans.request' ||
        id === 'dashboard.view.hubin' ||
        id === 'organization.scope.teaching_restricted' ||
        id.startsWith('cooperative.tickets.') ||
        id.startsWith('bk.cases.') ||
        // Cooperative member capabilities — GURU anggota koperasi membutuhkan akses
        // ke fitur ini namun capabilities-nya berdomain ORGANIZATIONAL sehingga
        // perlu di-whitelist di sini agar seed tidak gagal.
        id === 'cooperative.savings.view.list' ||
        id === 'cooperative.reports.view.daily' ||
        id === 'cooperative.reports.view.monthly' ||
        id === 'attendance.recap.view.global' ||
        id === 'attendance.monitoring.view.live.status'
      )) return false;
      return domainOf(id) === 'ORGANIZATIONAL';
    });
    if (violating.length > 0) {
      throw new Error(`Organizational capability found in baseline role ${role}: ${violating.join(', ')}`);
    }
  };

  ensureNoOrganizationalInBaseline('SUPERADMIN', superadmin);
  // ADMIN is allowed to have organizational baseline capabilities as a global tenant admin fallback
  ensureNoOrganizationalInBaseline('GURU', guru);
  ensureNoOrganizationalInBaseline('SISWA', siswa);

  const ensureNoPlatformInTenantRoles = (role: string, baseline: string[]) => {
    const violating = baseline.filter((id) => domainOf(id) === 'PLATFORM');
    if (violating.length > 0) {
      throw new Error(`Platform capability found in tenant role ${role}: ${violating.join(', ')}`);
    }
  };

  ensureNoPlatformInTenantRoles('ADMIN', admin);
  ensureNoPlatformInTenantRoles('GURU', guru);
  ensureNoPlatformInTenantRoles('SISWA', siswa);
  ensureNoPlatformInTenantRoles('ANGGOTA_KOPERASI_EXTERNAL', anggotaKoperasiExternal);

  return {
    SUPERADMIN: superadmin,
    PLATFORM_FINANCE: platformFinance,
    PLATFORM_SUPPORT: platformSupport,
    PLATFORM_INFRASTRUCTURE: platformInfrastructure,
    ADMIN: admin,
    GURU: guru,
    SISWA: siswa,
    ANGGOTA_KOPERASI_EXTERNAL: anggotaKoperasiExternal,
  };
}

async function parseActionCatalog(): Promise<{ id: string; group: string; description: string }[]> {
  const canonicalPath = path.join(__dirname, '../../../docs/action_catalog.md');
  if (!fs.existsSync(canonicalPath)) {
    throw new Error(`Canonical Action Catalog not found: ${canonicalPath}`);
  }

  const content = fs.readFileSync(canonicalPath, 'utf-8');
  const lines = content.split('\n');
  const permissions: { id: string; group: string; description: string }[] = [];
  let currentGroup = 'core';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      const header = trimmed.replace('## ', '').toLowerCase();
      if (header.includes('auth')) currentGroup = 'auth';
      else if (header.includes('user')) currentGroup = 'users';
      else if (header.includes('tenant')) currentGroup = 'tenants';
      else if (header.includes('academic')) currentGroup = 'academic';
      else if (header.includes('attendance')) currentGroup = 'attendance';
      else if (header.includes('billing')) currentGroup = 'billing';
      else if (header.includes('dashboard')) currentGroup = 'dashboard';
      else if (header.includes('notify') || header.includes('notifikasi')) currentGroup = 'notify';
      else if (header.includes('files') || header.includes('file')) currentGroup = 'files';
      else if (header.includes('superadmin')) currentGroup = 'superadmin';
      else if (header.includes('external')) currentGroup = 'external';
      else if (header.includes('affairs') || header.includes('kesiswaan')) currentGroup = 'kesiswaan';
      else if (header.includes('curriculum') || header.includes('kurikulum')) currentGroup = 'kurikulum';
      else if (header.includes('hubin')) currentGroup = 'hubin';
      else if (header.includes('sarpras')) currentGroup = 'sarpras';
      else if (header.includes('tu') || header.includes('tata usaha')) currentGroup = 'tu';
      else if (header.includes('system')) currentGroup = 'system';
      else currentGroup = 'other';
    }

    if (trimmed.startsWith('- ')) {
      const actionId = trimmed.replace('- ', '').trim();
      if (actionId.includes('.')) {
        permissions.push({
          id: actionId,
          group: currentGroup,
          description: `Action: ${actionId}`,
        });
      }
    }
  }
  return permissions;
}

export async function seedPolicies() {
  console.log('🚀 Starting Policy Engine Seeding (Consolidated)...');

  // 1. Seed Permissions from Canonical Action Catalog
  const permissions = await parseActionCatalog();
  console.log(`📋 Found ${permissions.length} actions in catalog.`);

  let seededCount = 0;
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: { group: p.group },
      create: {
        id: p.id,
        group: p.group,
        description: p.description
      }
    });
    seededCount++;
  }
  console.log(`✅ Seeded ${seededCount} permissions to database.`);

  // Clean up obsolete/junk permissions in DB that are no longer in catalog
  const catalogIds = permissions.map(p => p.id);
  await prisma.rolePermission.deleteMany({
    where: { permission_id: { notIn: catalogIds } }
  });
  const deleteOldPerms = await prisma.permission.deleteMany({
    where: { id: { notIn: catalogIds } }
  });
  if (deleteOldPerms.count > 0) {
    console.log(`🧹 Cleaned up ${deleteOldPerms.count} obsolete permissions from DB.`);
  }

  // 2. Seed System Roles + RolePermissions (Strict, Canonical Only)
  console.log('🔄 Processing Roles (Strict Canonical Baselines)...');

  const allDbPermissions = (await prisma.permission.findMany({ select: { id: true } })).map((p) => p.id);
  const validDbIds = new Set(allDbPermissions);
  const roleBaselines = buildRoleBaselines(allDbPermissions);

  await prisma.rolePermission.deleteMany({});

  const platformRoleDefs = [
    { name: 'SUPERADMIN', description: 'Global System Owner (akses penuh seluruh tenant)', tenant_id: 'system' },
    { name: 'PLATFORM_FINANCE', description: 'Staf Keuangan & Billing Platform Absenta.id', tenant_id: 'system' },
    { name: 'PLATFORM_SUPPORT', description: 'Staf Customer Service & Relations Platform Absenta.id', tenant_id: 'system' },
    { name: 'PLATFORM_INFRASTRUCTURE', description: 'Staf IT & DevOps Platform Absenta.id', tenant_id: 'system' },
  ];

  const tenantRoleDefs = [
    { name: 'ADMIN', description: 'Tenant Administrator (akses penuh tenant sendiri)', tenant_id: null },
    { name: 'GURU', description: 'Guru (akses pembelajaran & monitoring siswa)', tenant_id: null },
    { name: 'SISWA', description: 'Siswa (akses pribadi & pembayaran)', tenant_id: null },
    { name: 'ANGGOTA_KOPERASI_EXTERNAL', description: 'Anggota Koperasi Pihak Eksternal (akses terbatas)', tenant_id: null },
  ];

  const allRoleDefs = [...platformRoleDefs, ...tenantRoleDefs];

  const ensureRole = async (name: string, description: string, tenantId: string | null) => {
    const existing = await prisma.role.findFirst({ where: { tenant_id: tenantId, name } });
    if (existing) {
       return prisma.role.update({
         where: { id: existing.id },
         data: { description }
       });
    }
    return prisma.role.create({ data: { name, tenant_id: tenantId, description, is_system: true } });
  };

  for (const def of allRoleDefs) {
    const role = await ensureRole(def.name, def.description, def.tenant_id);
    const baseline = Array.isArray(roleBaselines[def.name]) ? roleBaselines[def.name] : [];

    const requestedCaps = uniqueStrings(baseline);
    const missingCaps = requestedCaps.filter((id) => !validDbIds.has(id));
    if (missingCaps.length > 0) {
      throw new Error(`RBAC baseline contains unknown canonical capability for role ${def.name}: ${missingCaps.join(', ')}`);
    }

    const finalCaps = requestedCaps;
    if (finalCaps.length > 0) {
      await prisma.rolePermission.createMany({
        data: finalCaps.map((permission_id) => ({ role_id: role.id, permission_id })),
        skipDuplicates: true,
      });
    }
  }

  console.log('✅ RolePermissions seeded (strict canonical).');
  
  // 3. Seed OrganizationalCapabilities from STRUKTUR_CAPABILITIES (Canonical)
  console.log('🔄 Seeding OrganizationalCapabilities from src/config/position-capabilities via Service...');
  
  // Using the service ensures code reuse and single source of logic
  await strukturOrganisasiService.seedAllCapabilities();

  console.log('✅ OrganizationalCapabilities seeded.');

  // 4. Propagate Permissions to all Tenant-specific Roles
  console.log('🔄 Propagating permissions to all existing tenant-level roles...');
  for (const def of tenantRoleDefs) {
    const baseline = roleBaselines[def.name] || [];
    const tenantRoles = await prisma.role.findMany({
      where: { 
        name: def.name, 
        tenant_id: { 
          notIn: ['system'],
          not: null 
        } 
      }, // hanya sinkronisasi tenant sekolah riil
      select: { id: true, tenant_id: true }
    });
    
    if (tenantRoles.length > 0) {
      console.log(`   - Syncing ${tenantRoles.length} tenant roles for: ${def.name}`);
      for (const tRole of tenantRoles) {
        // Clear current permissions and sync with baseline
        await prisma.rolePermission.deleteMany({ where: { role_id: tRole.id } });
        await prisma.rolePermission.createMany({
          data: baseline.map(pId => ({ role_id: tRole.id, permission_id: pId })),
          skipDuplicates: true
        });
      }
    }
  }

  console.log('🏁 Policy Engine Seeding Completed.');

}

if (require.main === module) {
  seedPolicies()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
