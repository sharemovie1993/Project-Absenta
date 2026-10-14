import { ReportService } from '../report.service';
import { prisma } from '@/utils/prisma';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    journal: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    journalItem: {
      findMany: jest.fn(),
    },
  },
}));

describe('ReportService - Laporan Keuangan (Neraca, Laba Rugi, Jurnal) Unit & QA Tests (Phase 5)', () => {
  const mockTenantId = 'tenant-coop-reports-test';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getBalanceSheet (Neraca Posisi Keuangan)', () => {
    it('harus menghitung saldo akun Aktiva, Kewajiban, Ekuitas dan memastikan Neraca Seimbang (Balanced)', async () => {
      // Mock accounts with journalItems
      const mockAccounts = [
        {
          id: 'acc-1',
          code: '1010',
          name: 'Kas Toko',
          type: 'ASSET',
          journalItems: [
            { amount: 10000000, type: 'DEBIT' },
            { amount: 2000000, type: 'CREDIT' },
          ]
        },
        {
          id: 'acc-2',
          code: '1011',
          name: 'Kas Bank BNI',
          type: 'ASSET',
          journalItems: [
            { amount: 5000000, type: 'DEBIT' },
          ]
        },
        {
          id: 'acc-3',
          code: '2010',
          name: 'Hutang Dagang Supplier',
          type: 'LIABILITY',
          journalItems: [
            { amount: 3000000, type: 'CREDIT' },
          ]
        },
        {
          id: 'acc-4',
          code: '3010',
          name: 'Simpanan Pokok Anggota',
          type: 'EQUITY',
          journalItems: [
            { amount: 10000000, type: 'CREDIT' },
          ]
        }
      ];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      // Mock getIncomeStatement internally called for current year earnings
      const incomeSpy = jest.spyOn(ReportService, 'getIncomeStatement').mockResolvedValue({
        summary: { totalRevenue: 0, totalExpense: 0, netIncome: 0 }
      } as any);

      const balanceSheet = await ReportService.getBalanceSheet(mockTenantId);
      incomeSpy.mockRestore();

      expect(prisma.account.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          tenantId: mockTenantId,
          type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }
        })
      }));

      // Asset calculation: (10,000,000 - 2,000,000) + 5,000,000 = 8,000,000 + 5,000,000 = 13,000,000
      expect(balanceSheet.summary.totalAssets).toBe(13000000);

      // Liability: 3,000,000
      expect(balanceSheet.summary.totalLiabilities).toBe(3000000);

      // Equity: 10,000,000
      expect(balanceSheet.summary.totalEquity).toBe(10000000);

      // Total Pasiva = Liabilities + Equity = 13,000,000
      expect(balanceSheet.summary.totalLiabilitiesAndEquity).toBe(13000000);

      // Balance check: Aktiva (13jt) === Pasiva (13jt)
      expect(balanceSheet.summary.isBalanced).toBe(true);
      expect(balanceSheet.summary.balanceCheck).toBe(0);
    });
  });

  describe('getIncomeStatement (Laporan Laba Rugi / PHU)', () => {
    it('harus menghitung total pendapatan usaha, total beban operasional, dan SHU bersih secara tepat', async () => {
      const mockPnLAccounts = [
        {
          id: 'acc-rev',
          code: '4010',
          name: 'Pendapatan Penjualan Toko',
          type: 'REVENUE',
          journalItems: [
            { amount: 25000000, type: 'CREDIT' },
          ]
        },
        {
          id: 'acc-cogs',
          code: '5010',
          name: 'Beban Pokok Penjualan (HPP)',
          type: 'EXPENSE',
          journalItems: [
            { amount: 15000000, type: 'DEBIT' },
          ]
        },
        {
          id: 'acc-exp',
          code: '5021',
          name: 'Beban Listrik & Air',
          type: 'EXPENSE',
          journalItems: [
            { amount: 2000000, type: 'DEBIT' },
          ]
        }
      ];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockPnLAccounts);

      const incomeStmt = await ReportService.getIncomeStatement(mockTenantId);

      expect(incomeStmt.summary.totalRevenue).toBe(25000000);
      expect(incomeStmt.summary.totalExpense).toBe(17000000); // 15,000,000 (HPP) + 2,000,000 (Beban)
      expect(incomeStmt.summary.netIncome).toBe(8000000); // 25,000,000 - 17,000,000 = 8,000,000
    });
  });

  describe('getJournals (Jurnal Umum)', () => {
    it('harus mengambil daftar entri jurnal umum terurut berdasarkan tanggal terbaru', async () => {
      const mockJournals = [
        {
          id: 'j-1',
          date: new Date('2026-10-14'),
          description: '[BKK] Beban Operasional',
          reference: 'BKK-202610-0001',
          items: [
            { id: 'ji-1', amount: 50000, type: 'DEBIT', account: { code: '5021', name: 'Beban Listrik' } },
            { id: 'ji-2', amount: 50000, type: 'CREDIT', account: { code: '1010', name: 'Kas' } },
          ]
        }
      ];

      (prisma.journal.findMany as jest.Mock).mockResolvedValue(mockJournals);

      const journals = await ReportService.getJournals(mockTenantId);

      expect(journals.length).toBe(1);
      expect(journals[0].reference).toBe('BKK-202610-0001');
      expect(journals[0].items.length).toBe(2);
      expect(prisma.journal.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tenantId: mockTenantId }),
        orderBy: { date: 'desc' }
      }));
    });
  });
});
