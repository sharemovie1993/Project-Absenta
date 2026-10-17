// @ts-nocheck
import { SetupService } from '../setup.service';
import { prisma } from '@/utils/prisma';
import { AccountService } from '../../laporan/account.service';
import { AccountingService } from '../../laporan/accounting.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    config: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    journal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    journalItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    savingAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    saving: {
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    savingTransaction: {
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    loan: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    installment: {
      deleteMany: jest.fn(),
    },
    sale: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    saleItem: {
      deleteMany: jest.fn(),
    },
    coopStockIn: {
      deleteMany: jest.fn(),
    },
    coopStockInItem: {
      deleteMany: jest.fn(),
    },
    coopStockOpname: {
      deleteMany: jest.fn(),
    },
    coopStockOpnameItem: {
      deleteMany: jest.fn(),
    },
    coopExpense: {
      deleteMany: jest.fn(),
    },
    coopCashDeposit: {
      deleteMany: jest.fn(),
    },
    coopFundTransfer: {
      deleteMany: jest.fn(),
    },
    coopPointTransaction: {
      deleteMany: jest.fn(),
    },
    pPOBTransaction: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../laporan/account.service', () => ({
  AccountService: {
    ensureDefaultHierarchy: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    getOrCreateDefaultAccounts: jest.fn().mockResolvedValue([]),
    resolveAccountId: jest.fn().mockResolvedValue('acc-resolved-id'),
    createJournalEntry: jest.fn().mockResolvedValue({
      id: 'journal-opening-1',
      reference: 'SETUP-OPENING-20260101',
      totalDebit: 10000000,
      totalCredit: 10000000,
    }),
  },
}));

describe('SetupService - Onboarding & Setup Wizard Unit & QA Tests (Phase 5)', () => {
  const mockTenantId = 'tenant-coop-setup-test';
  const mockOperatorId = 'user-admin-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getSetupStatus (Pemeriksaan Kesiapan Onboarding 360 Derajat)', () => {
    it('harus mengembalikan status kesiapan dengan checklist dan persentase', async () => {
      (prisma.config.findMany as jest.Mock).mockResolvedValue([
        { key: 'coop_setup_status', value: 'IN_PROGRESS' },
        { key: 'coop_setup_mode', value: 'ANNUAL_TRANSITION' },
        { key: 'coop_cutoff_date', value: '2026-01-01' },
      ]);
      (prisma.config.findFirst as jest.Mock).mockResolvedValue({
        key: 'cooperative_name',
        value: 'Koperasi Konsumen Baraya Sejahtera'
      });
      (prisma.account.count as jest.Mock).mockResolvedValue(31);
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.member.count as jest.Mock).mockResolvedValue(15);
      (prisma.product.count as jest.Mock).mockResolvedValue(5);

      const status = await SetupService.getSetupStatus(mockTenantId);

      expect(status).toBeDefined();
      expect(status.status).toBe('IN_PROGRESS');
      expect(status.mode).toBe('ANNUAL_TRANSITION');
      expect(status.cutoffDate).toBe('2026-01-01');
      expect(status.checklist.profileConfigured).toBe(true);
      expect(status.checklist.coaInitialized).toBe(true);
      expect(status.checklist.openingBalancePosted).toBe(false);
      expect(status.checklist.membersImported).toBe(true);
      expect(status.progressPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. setSetupMode (Konfigurasi Mode Onboarding)', () => {
    it('harus menyimpan mode onboarding dan tanggal cut-off pada configs tenant', async () => {
      (prisma.config.upsert as jest.Mock).mockResolvedValue({});
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.config.findMany as jest.Mock).mockResolvedValue([
        { key: 'coop_setup_status', value: 'IN_PROGRESS' },
        { key: 'coop_setup_mode', value: 'MID_YEAR_CUTOFF' },
        { key: 'coop_cutoff_date', value: '2026-06-30' },
      ]);
      (prisma.account.count as jest.Mock).mockResolvedValue(31);
      (prisma.member.count as jest.Mock).mockResolvedValue(15);
      (prisma.product.count as jest.Mock).mockResolvedValue(5);

      const result = await SetupService.setSetupMode(
        mockTenantId,
        'MID_YEAR_CUTOFF',
        '2026-06-30',
        mockOperatorId
      );

      expect(result.mode).toBe('MID_YEAR_CUTOFF');
      expect(result.cutoffDate).toBe('2026-06-30');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('3. postOpeningBalance (Strict Double-Entry Balanced Opening Journal)', () => {
    it('harus melempar error jika total Debit != total Credit (Unbalanced Journal)', async () => {
      const unbalancedInput = {
        mode: 'ANNUAL_TRANSITION' as const,
        cutoffDate: '2026-01-01',
        entries: [
          { accountCode: '1010', type: 'DEBIT' as const, amount: 10000000 },
          { accountCode: '3011', type: 'CREDIT' as const, amount: 9000000 }, // Selisih 1.000.000
        ]
      };

      await expect(
        SetupService.postOpeningBalance(mockTenantId, unbalancedInput, mockOperatorId)
      ).rejects.toThrow(/tidak seimbang/i);
    });

    it('harus berhasil memposting jurnal saldo awal jika Debit === Credit', async () => {
      const balancedInput = {
        mode: 'ANNUAL_TRANSITION' as const,
        cutoffDate: '2026-01-01',
        entries: [
          { accountCode: '1010', type: 'DEBIT' as const, amount: 10000000 },
          { accountCode: '3011', type: 'CREDIT' as const, amount: 10000000 },
        ],
        notes: 'Saldo awal migrasi 1 Jan 2026'
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (arg: any) => {
        if (typeof arg === 'function') {
          const tx = {
            journal: {
              findFirst: jest.fn().mockResolvedValue(null),
              delete: jest.fn(),
            },
            journalItem: {
              deleteMany: jest.fn(),
            },
            config: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({}),
              update: jest.fn().mockResolvedValue({}),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            }
          };
          return arg(tx);
        }
        return arg;
      });

      const res = await SetupService.postOpeningBalance(mockTenantId, balancedInput, mockOperatorId);

      expect(res).toBeDefined();
      expect(res.success).toBe(true);
      expect(res.journalId).toBe('journal-opening-1');
      expect(res.totalBalance).toBe(10000000);
      expect(AccountingService.createJournalEntry).toHaveBeenCalled();
    });
  });

  describe('4. completeSetup (Aktivasi Operasional Penuh Koperasi)', () => {
    it('harus mengupdate status setup menjadi COMPLETED', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.config.findMany as jest.Mock).mockResolvedValue([
        { key: 'coop_setup_status', value: 'COMPLETED' },
      ]);
      (prisma.account.count as jest.Mock).mockResolvedValue(31);
      (prisma.member.count as jest.Mock).mockResolvedValue(15);
      (prisma.product.count as jest.Mock).mockResolvedValue(5);

      const result = await SetupService.completeSetup(mockTenantId, mockOperatorId);

      expect(result.status).toBe('COMPLETED');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('5. resetSimulationData (Pembersihan Data Demo & Uji Coba Koperasi)', () => {
    it('harus membersihkan transaksi simulasi dan mereset status onboarding ke NOT_STARTED', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const mockTx = {
          saleItem: { deleteMany: jest.fn().mockResolvedValue({ count: 10 }) },
          sale: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
          coopStockOpnameItem: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
          coopStockOpname: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
          coopStockInItem: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) },
          coopStockIn: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
          coopPointTransaction: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          pPOBTransaction: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          coopExpense: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
          coopCashDeposit: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
          coopFundTransfer: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          installment: { deleteMany: jest.fn().mockResolvedValue({ count: 6 }) },
          loan: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
          savingTransaction: { deleteMany: jest.fn().mockResolvedValue({ count: 12 }) },
          saving: { updateMany: jest.fn().mockResolvedValue({ count: 15 }), deleteMany: jest.fn() },
          journalItem: { deleteMany: jest.fn().mockResolvedValue({ count: 20 }) },
          journal: { deleteMany: jest.fn().mockResolvedValue({ count: 8 }) },
          product: { updateMany: jest.fn().mockResolvedValue({ count: 5 }), deleteMany: jest.fn() },
          member: { deleteMany: jest.fn() },
          shuAllocation: { deleteMany: jest.fn() },
          voucher: { deleteMany: jest.fn() },
          coopMeetingAttendance: { deleteMany: jest.fn() },
          ticket: { deleteMany: jest.fn() },
          config: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
        };
        return callback(mockTx);
      });

      const res = await SetupService.resetSimulationData(mockTenantId, {
        purgeTransactions: true,
        purgeOpeningBalances: true,
        purgeMembers: false,
        purgeProducts: false,
        resetSetupStatus: true,
      }, mockOperatorId);

      expect(res).toBeDefined();
      expect(res.success).toBe(true);
      expect(res.purged.sales).toBe(5);
      expect(res.purged.loans).toBe(2);
      expect(res.purged.savingsTransactions).toBe(12);
      expect(res.purged.journals).toBe(8);
    });
  });
});
