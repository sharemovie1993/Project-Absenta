import { ExpenseService } from '../expense.service';
import { CashBankingService } from '../cash-banking.service';
import { prisma } from '@/utils/prisma';
import { AccountingService } from '../../laporan/accounting.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    coopExpense: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    coopCashDeposit: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    coopFundTransfer: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    journal: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    getOrCreateDefaultAccounts: jest.fn().mockResolvedValue([]),
    resolveAccountId: jest.fn().mockResolvedValue('acc-id-123'),
    createJournalEntry: jest.fn().mockResolvedValue({ id: 'journal-test-123' }),
    deleteJournalEntry: jest.fn().mockResolvedValue(true),
  },
}));

describe('Kas & Bank (Expense, Deposit, Transfer) - Unit & QA Audit Tests (Phase 5)', () => {
  const mockTenantId = 'tenant-coop-test';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default $transaction execution mock
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }
      return callback;
    });
  });

  describe('ExpenseService (BKK - Kas Keluar)', () => {
    it('harus menghasilkan nomor voucher BKK secara sekuensial', async () => {
      (prisma.coopExpense.count as jest.Mock).mockResolvedValue(4);

      const voucher = await ExpenseService.generateVoucherNumber(mockTenantId);
      const now = new Date();
      const prefix = `BKK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      expect(voucher).toBe(`${prefix}-0005`);
    });

    it('harus mencatat pengeluaran kas operasional dan membuat jurnal akuntansi Debit Beban / Kredit Kas', async () => {
      (prisma.coopExpense.count as jest.Mock).mockResolvedValue(0);
      (prisma.coopExpense.create as jest.Mock).mockResolvedValue({
        id: 'expense-1',
        voucherNumber: 'BKK-202610-0001',
        amount: 150000,
        categoryCode: '5021',
        categoryName: 'Beban Listrik, Air & Utilitas',
        paymentMethod: 'CASH',
        description: 'Pembayaran tagihan listrik minimarket',
      });

      const result = await ExpenseService.createExpense(mockTenantId, {
        categoryCode: '5021',
        amount: 150000,
        paymentMethod: 'CASH',
        description: 'Pembayaran tagihan listrik minimarket',
        date: '2026-10-14',
      });

      expect(result).toBeDefined();
      expect(prisma.coopExpense.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          amount: 150000,
          categoryCode: '5021',
          paymentMethod: 'CASH',
        })
      }));

      // Verifikasi jurnal: Debit 5021 (Beban), Kredit 1010 (Kas)
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('[BKK]'),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ accountCode: '5021', amount: 150000, type: 'DEBIT' }),
          expect.objectContaining({ accountCode: '1010', amount: 150000, type: 'CREDIT' }),
        ]),
        expect.anything(),
        expect.any(Date)
      );
    });

    it('harus menolak pencatatan pengeluaran jika nominal <= 0', async () => {
      await expect(ExpenseService.createExpense(mockTenantId, {
        categoryCode: '5021',
        amount: 0,
        description: 'Uji nominal nol',
        date: '2026-10-14',
      })).rejects.toThrow('Nominal pengeluaran operasional harus lebih besar dari 0');
    });
  });

  describe('CashBankingService (BKM - Kas Masuk)', () => {
    it('harus mencatat penerimaan kas (BKM) dan membuat jurnal Debit Kas/Bank / Kredit Pendapatan', async () => {
      (prisma.coopCashDeposit.count as jest.Mock).mockResolvedValue(0);
      (prisma.coopCashDeposit.create as jest.Mock).mockResolvedValue({
        id: 'deposit-1',
        voucherNumber: 'BKM-202610-0001',
        amount: 500000,
        accountCode: '4030',
        accountName: 'Pendapatan Sewa & Kerjasama',
        receivedVia: 'BANK_TRANSFER',
        description: 'Sewa space etalase produk UMKM',
      });

      const result = await CashBankingService.createDeposit(mockTenantId, {
        accountCode: '4030',
        amount: 500000,
        receivedVia: 'BANK_TRANSFER',
        description: 'Sewa space etalase produk UMKM',
        date: '2026-10-14',
      });

      expect(result).toBeDefined();
      expect(prisma.coopCashDeposit.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          amount: 500000,
          accountCode: '4030',
          receivedVia: 'BANK_TRANSFER',
        })
      }));

      // Verifikasi jurnal: Debit 1011 (Kas Bank), Kredit 4030 (Pendapatan Sewa)
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('[BKM]'),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ accountCode: '1011', amount: 500000, type: 'DEBIT' }),
          expect.objectContaining({ accountCode: '4030', amount: 500000, type: 'CREDIT' }),
        ]),
        expect.anything(),
        expect.any(Date)
      );
    });

    it('harus menghapus data BKM dan membatalkan jurnal referensinya secara atomik', async () => {
      (prisma.coopCashDeposit.findFirst as jest.Mock).mockResolvedValue({
        id: 'deposit-1',
        tenantId: mockTenantId,
        voucherNumber: 'BKM-202610-0001',
      });

      const res = await CashBankingService.deleteDeposit(mockTenantId, 'deposit-1');

      expect(res.success).toBe(true);
      expect(prisma.journal.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, reference: 'BKM-202610-0001' }
      });
      expect(prisma.coopCashDeposit.delete).toHaveBeenCalledWith({ where: { id: 'deposit-1' } });
    });
  });

  describe('CashBankingService (TRF - Mutasi / Pindah Kas Bank)', () => {
    it('harus menolak transfer jika rekening sumber dan tujuan adalah akun yang sama', async () => {
      await expect(CashBankingService.createTransfer(mockTenantId, {
        fromAccountCode: '1010',
        toAccountCode: '1010',
        amount: 100000,
        description: 'Uji transfer akun identik',
        date: '2026-10-14',
      })).rejects.toThrow('Akun sumber kas dan akun tujuan kas tidak boleh sama');
    });

    it('harus mencatat transfer dana dari Kas Tunai ke Bank dengan jurnal Debit Bank / Kredit Tunai', async () => {
      (prisma.coopFundTransfer.count as jest.Mock).mockResolvedValue(0);
      (prisma.coopFundTransfer.create as jest.Mock).mockResolvedValue({
        id: 'transfer-1',
        voucherNumber: 'TRF-202610-0001',
        amount: 1000000,
        fromAccountCode: '1010',
        toAccountCode: '1011',
        description: 'Setor uang tunai kasir toko ke rekening bank koperasi',
      });

      const result = await CashBankingService.createTransfer(mockTenantId, {
        fromAccountCode: '1010',
        toAccountCode: '1011',
        amount: 1000000,
        description: 'Setor uang tunai kasir toko ke rekening bank koperasi',
        date: '2026-10-14',
      });

      expect(result).toBeDefined();
      expect(prisma.coopFundTransfer.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          amount: 1000000,
          fromAccountCode: '1010',
          toAccountCode: '1011',
        })
      }));

      // Verifikasi jurnal: Debit 1011 (Bank Tujuan), Kredit 1010 (Kas Asal)
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('[TRF]'),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ accountCode: '1011', amount: 1000000, type: 'DEBIT' }),
          expect.objectContaining({ accountCode: '1010', amount: 1000000, type: 'CREDIT' }),
        ]),
        expect.anything(),
        expect.any(Date)
      );
    });
  });
});
