import { cacheService } from '@/utils/cache.service';

jest.mock('@/infra/redis/redisClient', () => ({
  getRedisConnection: () => {
    throw new Error('redis disabled in unit tests');
  },
}));

jest.mock('@/utils/prisma', () => ({
  prisma: {
    menu: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/utils/prisma';
import { sidebarRenderingService } from '../sidebar-rendering.service';

describe('SidebarRenderingService', () => {
  beforeEach(() => {
    (cacheService as any).memoryCache?.clear?.();
    const g: any = globalThis as any;
    if (g.__cacheLocks?.clear) g.__cacheLocks.clear();
    (prisma.menu.findMany as jest.Mock).mockReset();
  });

  it('filters by required_features and required_capability', async () => {
    (prisma.menu.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', parent_id: null, name: 'Absensi', path: '/menu/attendance', icon: null, order: 1, is_active: true, scope: 'TENANT', required_features: ['ABSENSI'], required_capability: null, requires_petugas_active: false },
      { id: 'c1', parent_id: 'p1', name: 'Scan', path: '/attendance/ops', icon: null, order: 2, is_active: true, scope: 'TENANT', required_features: null, required_capability: 'attendance.sessions.update.attendance', requires_petugas_active: true },
      { id: 'p2', parent_id: null, name: 'Dashboard', path: '/dashboard', icon: null, order: 3, is_active: true, scope: 'TENANT', required_features: ['CORE'], required_capability: 'dashboard.view.overview', requires_petugas_active: false },
    ]);

    const res = await sidebarRenderingService.getSidebarForUser({
      userId: 'u1',
      role: 'SISWA',
      capabilities: ['dashboard.view.overview'],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: false },
    });

    expect(res).toEqual([
      {
        id: 'p2',
        name: 'Dashboard',
        path: '/dashboard',
        icon: null,
        order: 3,
        children: [],
      },
    ]);
  });

  it('keeps parent only if it has visible children (group nodes without required_capability are pruned)', async () => {
    (prisma.menu.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', parent_id: null, name: 'Group', path: '/menu/group', icon: null, order: 1, is_active: true, scope: 'TENANT', required_features: ['CORE'], required_capability: null, requires_petugas_active: false },
      { id: 'c1', parent_id: 'p1', name: 'Child', path: '/child', icon: null, order: 2, is_active: true, scope: 'TENANT', required_features: ['ABSENSI'], required_capability: 'attendance.recap.view.daily', requires_petugas_active: false },
    ]);

    const res = await sidebarRenderingService.getSidebarForUser({
      userId: 'u2',
      role: 'ADMIN',
      capabilities: ['attendance.recap.view.daily'],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    });

    expect(res).toEqual([]);
  });

  it('caches sidebar per userId', async () => {
    (prisma.menu.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', parent_id: null, name: 'Dashboard', path: '/dashboard', icon: null, order: 1, is_active: true, scope: 'TENANT', required_features: ['CORE'], required_capability: 'dashboard.view.overview', requires_petugas_active: false },
    ]);

    const ctx = {
      userId: 'u3',
      role: 'GURU',
      capabilities: ['dashboard.view.overview'],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    };

    await sidebarRenderingService.getSidebarForUser(ctx);
    await sidebarRenderingService.getSidebarForUser(ctx);

    expect((prisma.menu.findMany as jest.Mock).mock.calls.length).toBe(1);
  });

  it('inherits required_features from parent (SUPERADMIN bypass capability but still respects feature)', async () => {
    (prisma.menu.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', parent_id: null, name: 'Absensi', path: '/menu/attendance', icon: null, order: 1, is_active: true, scope: 'PLATFORM', required_features: ['ABSENSI'], required_capability: null, requires_petugas_active: false },
      { id: 'c1', parent_id: 'p1', name: 'Scan', path: '/attendance/ops', icon: null, order: 2, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'attendance.sessions.update.attendance', requires_petugas_active: false },
    ]);

    const resNoAbsensi = await sidebarRenderingService.getSidebarForUser({
      userId: 'u4',
      role: 'SUPERADMIN',
      capabilities: [],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    });

    expect(resNoAbsensi).toEqual([]);

    await sidebarRenderingService.invalidateUser('u4');

    const resWithAbsensi = await sidebarRenderingService.getSidebarForUser({
      userId: 'u4',
      role: 'SUPERADMIN',
      capabilities: [],
      tenantFeatures: ['CORE', 'ABSENSI'],
      organizationalScope: { petugasActive: true },
    });

    expect(resWithAbsensi).toEqual([
      {
        id: 'p1',
        name: 'Absensi',
        path: '/menu/attendance',
        icon: null,
        order: 1,
        children: [
          { id: 'c1', name: 'Scan', path: '/attendance/ops', icon: null, order: 2, children: [] },
        ],
      },
    ]);
  });

  it('inherits required_features recursively (multi-level)', async () => {
    (prisma.menu.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', parent_id: null, name: 'Absensi', path: '/menu/attendance', icon: null, order: 1, is_active: true, scope: 'PLATFORM', required_features: ['ABSENSI'], required_capability: null, requires_petugas_active: false },
      { id: 'c1', parent_id: 'p1', name: 'Scan', path: '/attendance/ops', icon: null, order: 2, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: null, requires_petugas_active: false },
      { id: 'g1', parent_id: 'c1', name: 'Scan Detail', path: '/attendance/ops/detail', icon: null, order: 3, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'attendance.sessions.update.attendance', requires_petugas_active: false },
    ]);

    const resNoAbsensi = await sidebarRenderingService.getSidebarForUser({
      userId: 'u5',
      role: 'SUPERADMIN',
      capabilities: [],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    });

    expect(resNoAbsensi).toEqual([]);

    await sidebarRenderingService.invalidateUser('u5');

    const resWithAbsensi = await sidebarRenderingService.getSidebarForUser({
      userId: 'u5',
      role: 'SUPERADMIN',
      capabilities: [],
      tenantFeatures: ['CORE', 'ABSENSI'],
      organizationalScope: { petugasActive: true },
    });

    expect(resWithAbsensi).toEqual([
      {
        id: 'p1',
        name: 'Absensi',
        path: '/menu/attendance',
        icon: null,
        order: 1,
        children: [
          {
            id: 'c1',
            name: 'Scan',
            path: '/attendance/ops',
            icon: null,
            order: 2,
            children: [
              { id: 'g1', name: 'Scan Detail', path: '/attendance/ops/detail', icon: null, order: 3, children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it('filters menus by scope (TENANT vs PLATFORM)', async () => {
    const tenantMenu = { id: 't1', parent_id: null, name: 'Tenant Dashboard', path: '/dashboard', icon: null, order: 1, is_active: true, scope: 'TENANT', required_features: ['CORE'], required_capability: 'dashboard.view.overview', requires_petugas_active: false };
    const platformMenu = { id: 'p1', parent_id: null, name: 'Platform Console', path: '/platform', icon: null, order: 1, is_active: true, scope: 'PLATFORM', required_features: ['CORE'], required_capability: 'superadmin.tenants.manage', requires_petugas_active: false };

    (prisma.menu.findMany as jest.Mock).mockImplementation(async (args: any) => {
      const scope = args?.where?.scope;
      if (scope === 'TENANT') return [tenantMenu];
      if (scope === 'PLATFORM') return [platformMenu];
      return [];
    });

    const adminRes = await sidebarRenderingService.getSidebarForUser({
      userId: 'u6',
      role: 'ADMIN',
      capabilities: ['dashboard.view.overview', 'superadmin.tenants.manage'],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    });
    expect(adminRes.map((x: any) => x.name)).toEqual(['Tenant Dashboard']);

    await sidebarRenderingService.invalidateUser('u6');

    const saRes = await sidebarRenderingService.getSidebarForUser({
      userId: 'u6',
      role: 'SUPERADMIN',
      capabilities: [],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    });
    expect(saRes.map((x: any) => x.name)).toEqual(['Platform Console']);
  });

  it('returns platform console menu tree for SUPERADMIN (scope PLATFORM only)', async () => {
    const menus = [
      { id: 't', parent_id: null, name: 'Tenants', path: '/tenants', icon: null, order: 1, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.tenants.view.list', requires_petugas_active: false },
      { id: 'b', parent_id: null, name: 'Billing', path: '/menu/billing-console', icon: null, order: 10, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: null, requires_petugas_active: false },
      { id: 'r', parent_id: 'b', name: 'Revenue', path: '/superadmin/revenue', icon: null, order: 10, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'superadmin.revenue.view.overview', requires_petugas_active: false },
      { id: 'bd', parent_id: 'b', name: 'Billing Dashboard', path: '/billing/dashboard', icon: null, order: 20, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'dashboard.view.financial_summary', requires_petugas_active: false },
      { id: 'bp', parent_id: 'b', name: 'Plans', path: '/billing/plans', icon: null, order: 30, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'billing.plans.view.list', requires_petugas_active: false },
      { id: 'bs', parent_id: 'b', name: 'Subscriptions', path: '/billing/subscriptions', icon: null, order: 40, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'billing.subscriptions.view.active', requires_petugas_active: false },
      { id: 'bi', parent_id: 'b', name: 'Invoices', path: '/billing/invoices', icon: null, order: 50, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'billing.invoices.view.list', requires_petugas_active: false },
      { id: 'br', parent_id: 'b', name: 'Reports', path: '/billing/reports', icon: null, order: 60, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'billing.reports.view.summary', requires_petugas_active: false },
      { id: 'bset', parent_id: 'b', name: 'Settings', path: '/billing/settings', icon: null, order: 70, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.system.config.view', requires_petugas_active: false },
      { id: 'bts', parent_id: 'b', name: 'Tripay Simulator', path: '/billing/tripay-simulator', icon: null, order: 80, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'billing.invoices.view.list', requires_petugas_active: false },
      { id: 'o', parent_id: null, name: 'Observability', path: '/menu/observability', icon: null, order: 20, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: null, requires_petugas_active: false },
      { id: 'io', parent_id: 'o', name: 'Overview', path: '/superadmin/intelligence', icon: null, order: 10, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.tenants.view.list', requires_petugas_active: false },
      { id: 'ir', parent_id: 'o', name: 'Revenue Intelligence', path: '/superadmin/intelligence/revenue', icon: null, order: 20, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.tenants.view.list', requires_petugas_active: false },
      { id: 'iu', parent_id: 'o', name: 'Upgrade Intelligence', path: '/superadmin/intelligence/upgrade', icon: null, order: 30, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.tenants.view.list', requires_petugas_active: false },
      { id: 'bm', parent_id: 'o', name: 'Monitoring', path: '/billing/monitoring', icon: null, order: 40, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'attendance.monitoring.view.live_status', requires_petugas_active: false },
      { id: 'bth', parent_id: 'o', name: 'Tripay Health', path: '/billing/tripay-health', icon: null, order: 50, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'attendance.monitoring.view.live_status', requires_petugas_active: false },
      { id: 'inf', parent_id: null, name: 'Infrastructure', path: '/menu/infrastructure', icon: null, order: 30, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: null, requires_petugas_active: false },
      { id: 'si', parent_id: 'inf', name: 'Infrastructure', path: '/superadmin/infra', icon: null, order: 10, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'superadmin.infra.view.socket_global', requires_petugas_active: false },
      { id: 'ij', parent_id: 'inf', name: 'Infra Control Center', path: '/superadmin/infra/jobs', icon: null, order: 20, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.tenants.view.list', requires_petugas_active: false },
      { id: 'a', parent_id: null, name: 'Administration', path: '/menu/system-management', icon: null, order: 40, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: null, requires_petugas_active: false },
      { id: 'sr', parent_id: 'a', name: 'Role Management', path: '/management/roles', icon: null, order: 10, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.users.view.roles', requires_petugas_active: false },
      { id: 'sm', parent_id: 'a', name: 'Menu Management', path: '/management/menus', icon: null, order: 20, is_active: true, scope: 'PLATFORM', required_features: null, required_capability: 'core.menu.view.list', requires_petugas_active: false },
      { id: 'td', parent_id: null, name: 'Tenant Dashboard', path: '/dashboard', icon: null, order: 1, is_active: true, scope: 'TENANT', required_features: ['CORE'], required_capability: 'dashboard.view.overview', requires_petugas_active: false },
    ];

    (prisma.menu.findMany as jest.Mock).mockImplementation(async (args: any) => {
      const scope = args?.where?.scope;
      if (scope === 'PLATFORM') return menus.filter((m) => m.scope === 'PLATFORM');
      if (scope === 'TENANT') return menus.filter((m) => m.scope === 'TENANT');
      return [];
    });

    const saRes = await sidebarRenderingService.getSidebarForUser({
      userId: 'u7',
      role: 'SUPERADMIN',
      capabilities: [],
      tenantFeatures: ['CORE'],
      organizationalScope: { petugasActive: true },
    });

    expect(saRes).toEqual([
      {
        id: 't',
        name: 'Tenants',
        path: '/tenants',
        icon: null,
        order: 1,
        children: [],
      },
      {
        id: 'b',
        name: 'Billing',
        path: '/menu/billing-console',
        icon: null,
        order: 10,
        children: [
          { id: 'r', name: 'Revenue', path: '/superadmin/revenue', icon: null, order: 10, children: [] },
          { id: 'bd', name: 'Billing Dashboard', path: '/billing/dashboard', icon: null, order: 20, children: [] },
          { id: 'bp', name: 'Plans', path: '/billing/plans', icon: null, order: 30, children: [] },
          { id: 'bs', name: 'Subscriptions', path: '/billing/subscriptions', icon: null, order: 40, children: [] },
          { id: 'bi', name: 'Invoices', path: '/billing/invoices', icon: null, order: 50, children: [] },
          { id: 'br', name: 'Reports', path: '/billing/reports', icon: null, order: 60, children: [] },
          { id: 'bset', name: 'Settings', path: '/billing/settings', icon: null, order: 70, children: [] },
          { id: 'bts', name: 'Tripay Simulator', path: '/billing/tripay-simulator', icon: null, order: 80, children: [] },
        ],
      },
      {
        id: 'o',
        name: 'Observability',
        path: '/menu/observability',
        icon: null,
        order: 20,
        children: [
          { id: 'io', name: 'Overview', path: '/superadmin/intelligence', icon: null, order: 10, children: [] },
          { id: 'ir', name: 'Revenue Intelligence', path: '/superadmin/intelligence/revenue', icon: null, order: 20, children: [] },
          { id: 'iu', name: 'Upgrade Intelligence', path: '/superadmin/intelligence/upgrade', icon: null, order: 30, children: [] },
          { id: 'bm', name: 'Monitoring', path: '/billing/monitoring', icon: null, order: 40, children: [] },
          { id: 'bth', name: 'Tripay Health', path: '/billing/tripay-health', icon: null, order: 50, children: [] },
        ],
      },
      {
        id: 'inf',
        name: 'Infrastructure',
        path: '/menu/infrastructure',
        icon: null,
        order: 30,
        children: [
          { id: 'si', name: 'Infrastructure', path: '/superadmin/infra', icon: null, order: 10, children: [] },
          { id: 'ij', name: 'Infra Control Center', path: '/superadmin/infra/jobs', icon: null, order: 20, children: [] },
        ],
      },
      {
        id: 'a',
        name: 'Administration',
        path: '/menu/system-management',
        icon: null,
        order: 40,
        children: [
          { id: 'sr', name: 'Role Management', path: '/management/roles', icon: null, order: 10, children: [] },
          { id: 'sm', name: 'Menu Management', path: '/management/menus', icon: null, order: 20, children: [] },
        ],
      },
    ]);
  });
});
