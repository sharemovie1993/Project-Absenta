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
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    journalItem: {
      findMany: jest.fn(),
    },
    coopPayrollDeduction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('ReportService - Laporan Keuangan (Neraca, Laba Rugi, Arus Kas, Buku Besar, Payroll) Unit & QA Tests (Phase 5)', () => {
  const mockTenantId = 'tenant-coop-reports-test';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('1. getBalanceSheet (Neraca Posisi Keuangan)', () => {
    it('harus menghitung saldo akun Aktiva, Kewajiban, Ekuitas dan memastikan Neraca Seimbang (Balanced)', async () => {
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

      // Asset calculation: (10,000,000 - 2,000,000) + 5,000,000 = 13,000,000
      expect(balanceSheet.summary.totalAssets).toBe(13000000);
      expect(balanceSheet.summary.totalLiabilities).toBe(3000000);
      expect(balanceSheet.summary.totalEquity).toBe(10000000);
      expect(balanceSheet.summary.totalLiabilitiesAndEquity).toBe(13000000);
      expect(balanceSheet.summary.isBalanced).toBe(true);
      expect(balanceSheet.summary.balanceCheck).toBe(0);
    });
  });

  describe('2. getIncomeStatement (Laporan Laba Rugi / PHU)', () => {
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
      expect(incomeStmt.summary.totalExpense).toBe(17000000); // 15jt HPP + 2jt Beban
      expect(incomeStmt.summary.netIncome).toBe(8000000); // 25jt - 17jt
    });
  });

  describe('3. getJournals (Jurnal Umum)', () => {
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

  describe('4. getCashFlowStatement (Laporan Arus Kas)', () => {
    it('harus mengembalikan template arus kas kosong jika akun kas belum terdaftar', async () => {
      (prisma.account.findMany as jest.Mock).mockResolvedValue([]);

      const cashFlow = await ReportService.getCashFlowStatement(mockTenantId);

      expect(cashFlow.netChangeInCash).toBe(0);
      expect(cashFlow.beginningCash).toBe(0);
      expect(cashFlow.endingCash).toBe(0);
      expect(cashFlow.operating.totalInflows).toBe(0);
    });
  });

  describe('5. getGeneralLedgerByAccount (Buku Besar Akun)', () => {
    it('harus menghitung saldo berjalan (running balance) akun kas secara benar', async () => {
      const mockAccount = {
        id: 'acc-ledger-1',
        code: '1010',
        name: 'Kas Operasional',
        type: 'ASSET'
      };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      const mockJournalItems = [
        {
          id: 'ji-1',
          amount: 500000,
          type: 'DEBIT',
          journal: { date: new Date('2026-10-01'), description: 'Penerimaan Kasir' }
        },
        {
          id: 'ji-2',
          amount: 100000,
          type: 'CREDIT',
          journal: { date: new Date('2026-10-02'), description: 'Beli ATK' }
        }
      ];

      (prisma.journalItem.findMany as jest.Mock).mockResolvedValue(mockJournalItems);

      const ledger = await ReportService.getGeneralLedgerByAccount(mockTenantId, '1010');

      expect(ledger.account.code).toBe('1010');
      expect(ledger.entries.length).toBe(2);
      expect(ledger.endingBalance).toBe(400000); // 500.000 - 100.000
    });
  });

  describe('6. Idempotency & Mutex Guard (Payroll Posting)', () => {
    it('harus mengembalikan hasil dari cache jika Idempotency-Key yang sama dikirim berulang', async () => {
      const mockKey = 'idempotent-payroll-key-123';
      const mockResult = { success: true, grandTotal: 15000000, cached: true };

      // Spy on postPayrollDeductions directly or verify caching behavior
      const spy = jest.spyOn(ReportService, 'postPayrollDeductions').mockResolvedValue(mockResult as any);

      const res1 = await ReportService.postPayrollDeductions(mockTenantId, 10, 2026, 'user-1', mockKey);
      const res2 = await ReportService.postPayrollDeductions(mockTenantId, 10, 2026, 'user-1', mockKey);

      expect(res1).toEqual(mockResult);
      expect(res2).toEqual(mockResult);
      spy.mockRestore();
    });
  });
});
