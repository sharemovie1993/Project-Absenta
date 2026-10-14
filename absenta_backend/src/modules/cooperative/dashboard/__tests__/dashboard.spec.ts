import Fastify from 'fastify';
import dashboardRoutes, { invalidateDashboardCache } from '../dashboard.fastify';
import { prisma } from '@/utils/prisma';
import { MemberService } from '../../member/member.service';
import { eventBus } from '@/utils/event-bus';

jest.mock('@/utils/app-logger', () => ({
  appLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/utils/prisma', () => ({
  prisma: {
    member: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    saving: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    savingCategory: {
      findMany: jest.fn(),
    },
    loan: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    installment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sale: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    shuPeriod: {
      findFirst: jest.fn(),
    },
    ticket: {
      count: jest.fn(),
    },
    savingTransaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../member/member.service', () => ({
  MemberService: {
    getMemberByUserId: jest.fn(),
  },
}));

jest.mock('@/middlewares/requireCapability', () => ({
  requireCapability: () => async (req: any) => {
    req.user = { id: 'user-test-123', tenant_id: 'tenant-dashboard-audit' };
  },
}));

describe('Cooperative Dashboard Engine - Phase 5 Comprehensive QA & Audit Suite', () => {
  let app: any;
  const mockTenantId = 'tenant-dashboard-audit';

  beforeAll(async () => {
    app = Fastify();
    await app.register(dashboardRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateDashboardCache(mockTenantId);

    // Default Prisma Mocks
    (prisma.member.count as jest.Mock).mockResolvedValue(100);
    (prisma.saving.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 50000000 } });
    (prisma.savingCategory.findMany as jest.Mock).mockResolvedValue([
      { id: 'cat-1', code: 'POKOK', name: 'Simpanan Pokok' },
      { id: 'cat-2', code: 'WAJIB', name: 'Simpanan Wajib' },
    ]);
    (prisma.saving.groupBy as jest.Mock).mockResolvedValue([
      { categoryId: 'cat-1', _sum: { amount: 20000000 } },
      { categoryId: 'cat-2', _sum: { amount: 30000000 } },
    ]);
    (prisma.loan.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 15000000 } });
    (prisma.loan.count as jest.Mock).mockResolvedValue(5);
    (prisma.loan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.installment.aggregate as jest.Mock).mockResolvedValue({ _count: { id: 2 }, _sum: { amount: 1000000 } });
    (prisma.sale.aggregate as jest.Mock).mockResolvedValue({ _sum: { total: 2500000 }, _count: { id: 20 } });
    (prisma.shuPeriod.findFirst as jest.Mock).mockResolvedValue({ id: 'shu-1', year: 2026, totalShu: 10000000, status: 'AKTIF' });
    (prisma.ticket.count as jest.Mock).mockResolvedValue(1);
    (prisma.installment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.savingTransaction.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.savingTransaction.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 5000000 } });
  });

  describe('1. GET /stats — Executive Metrics & Caching Guard', () => {
    it('harus mengembalikan metrik eksekutif lengkap dengan status cached: false pada hit pertama', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.cached).toBe(false);
      expect(body.data.totalMembers).toBe(100);
      expect(body.data.totalSavings).toBe(50000000);
      expect(body.data.wajibCompliance).toBeDefined();
      expect(body.data.loanPortfolio).toBeDefined();
    });

    it('harus mengembalikan cached: true pada permintaan berikutnya dalam jendela TTL', async () => {
      // Hit 1
      await app.inject({ method: 'GET', url: '/stats' });

      // Hit 2
      const response = await app.inject({ method: 'GET', url: '/stats' });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.cached).toBe(true);
      expect(body.cacheAgeSeconds).toBeDefined();
    });

    it('harus mengosongkan cache ketika event bus mempublikasikan perubahan transaksi koperasi', async () => {
      // Hit 1 (mengisi cache)
      await app.inject({ method: 'GET', url: '/stats' });

      // Event bus trigger mutasi
      await eventBus.publish('coop:transaction:created', { tenantId: mockTenantId });

      // Hit berikutnya harus mengambil data baru (cached: false)
      const response = await app.inject({ method: 'GET', url: '/stats' });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.cached).toBe(false);
    });

    it('harus melakukan rate limiting throttle jika parameter ?refresh=true dipanggil berulang kali', async () => {
      // Hit 1
      await app.inject({ method: 'GET', url: '/stats' });

      // Force refresh 1
      const res1 = await app.inject({ method: 'GET', url: '/stats?refresh=true' });
      expect(JSON.parse(res1.body).cached).toBe(false);

      // Force refresh 2 dalam < 5 detik harus di-throttle dan menyajikan cache
      const res2 = await app.inject({ method: 'GET', url: '/stats?refresh=true' });
      expect(JSON.parse(res2.body).cached).toBe(true);
    });
  });

  describe('2. GET /summary-member — Dedicated Member Self-Service Portal', () => {
    it('harus mengembalikan status isMember: false jika user bukan anggota koperasi', async () => {
      (MemberService.getMemberByUserId as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/summary-member',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.isMember).toBe(false);
    });

    it('harus mengembalikan rincian simpanan dan status kepatuhan simpanan wajib jika user aktif', async () => {
      (MemberService.getMemberByUserId as jest.Mock).mockResolvedValue({
        id: 'member-audit-1',
        memberNo: 'KOP-001',
        name: 'Ahmad Guru',
        type: 'TEACHER',
        status: 'ACTIVE',
        joinDate: new Date('2024-01-01'),
      });

      (prisma.saving.findMany as jest.Mock).mockResolvedValue([
        { amount: 500000, categoryId: 'cat-1', category: { code: 'POKOK' } },
        { amount: 1500000, categoryId: 'cat-2', category: { code: 'WAJIB' } },
      ]);

      (prisma.savingTransaction.findFirst as jest.Mock).mockResolvedValue(null); // Belum bayar wajib bulan ini

      const response = await app.inject({
        method: 'GET',
        url: '/summary-member',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.isMember).toBe(true);
      expect(body.data.mySavings.total).toBe(2000000);
      expect(body.data.mySavings.unpaidWajibThisMonth).toBe(true);
    });
  });

  describe('3. GET /quick-actions — Badge Indicators', () => {
    it('harus mengembalikan cacah antrean aksi secara tepat dan cepat', async () => {
      (prisma.member.count as jest.Mock).mockResolvedValue(3);
      (prisma.loan.count as jest.Mock).mockResolvedValue(2);
      (prisma.ticket.count as jest.Mock).mockResolvedValue(1);
      (prisma.installment.count as jest.Mock).mockResolvedValue(4);

      const response = await app.inject({
        method: 'GET',
        url: '/quick-actions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.pendingMembers).toBe(3);
      expect(body.data.pendingLoans).toBe(2);
      expect(body.data.openTickets).toBe(1);
      expect(body.data.overdueInstallments).toBe(4);
    });
  });
});
