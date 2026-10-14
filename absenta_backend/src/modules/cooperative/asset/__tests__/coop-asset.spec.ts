import { AssetService } from '../asset.service';
import { prisma } from '@/utils/prisma';
import { AccountingService } from '../../laporan/accounting.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    coopAsset: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    journal: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    journalItem: {
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
  },
}));

describe('Inventory Asset Koperasi - Phase 3, 4, 5 Enterprise Audit & Unit Tests', () => {
  const mockTenantId = 'tenant-coop-test';

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }
      return callback;
    });
  });

  describe('1. Asset Code Generator', () => {
    it('harus menghasilkan kode aset unik format AST-KOP-YYYY-XXXX berurutan', async () => {
      (prisma.coopAsset.count as jest.Mock).mockResolvedValue(5);

      const code = await AssetService.generateAssetCode(mockTenantId);
      const currentYear = new Date().getFullYear();

      expect(code).toBe(`AST-KOP-${currentYear}-0006`);
      expect(prisma.coopAsset.count).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          code: { startsWith: `AST-KOP-${currentYear}` }
        }
      });
    });
  });

  describe('2. Asset Registration & Journal Posting (Phase 3 & 4)', () => {
    it('harus mendaftarkan aset dengan pendanaan KAS (1010) dan memposting ke Jurnal Akuntansi', async () => {
      (prisma.coopAsset.count as jest.Mock).mockResolvedValue(0);
      const mockCreatedAsset = {
        id: 'asset-1',
        tenantId: mockTenantId,
        code: 'AST-KOP-2026-0001',
        name: 'Showcase Cooler Polytron',
        category: 'COOLING_APPLIANCE',
        location: 'Toko Koperasi Depan',
        purchaseDate: new Date('2026-10-01'),
        purchasePrice: 4500000,
        usefulLifeMonths: 48,
        salvageValue: 500000,
        condition: 'GOOD',
        status: 'IN_USE',
      };
      (prisma.coopAsset.create as jest.Mock).mockResolvedValue(mockCreatedAsset);

      const result = await AssetService.createAsset(mockTenantId, {
        name: 'Showcase Cooler Polytron',
        category: 'COOLING_APPLIANCE',
        location: 'Toko Koperasi Depan',
        purchaseDate: '2026-10-01',
        purchasePrice: 4500000,
        usefulLifeMonths: 48,
        salvageValue: 500000,
        fundingSource: 'CASH',
        postToLedger: true,
      });

      expect(result.id).toBe('asset-1');
      expect(result.purchasePrice).toBe(4500000);
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Showcase Cooler Polytron'),
        'AST-AST-KOP-2026-0001',
        [
          { accountCode: '1510', type: 'DEBIT', amount: 4500000 },
          { accountCode: '1010', type: 'CREDIT', amount: 4500000 },
        ],
        expect.anything(),
        expect.any(Date)
      );
    });

    it('harus mendaftarkan aset dengan pendanaan MODAL/DANA CADANGAN (3020) ketika fundingSource RESERVE_CAPITAL', async () => {
      (prisma.coopAsset.count as jest.Mock).mockResolvedValue(1);
      (prisma.coopAsset.create as jest.Mock).mockResolvedValue({
        id: 'asset-2',
        tenantId: mockTenantId,
        code: 'AST-KOP-2026-0002',
        name: 'Rak Gondola Minimarket',
        purchaseDate: new Date('2026-10-02'),
        purchasePrice: 2000000,
        salvageValue: 0,
      });

      await AssetService.createAsset(mockTenantId, {
        name: 'Rak Gondola Minimarket',
        category: 'DISPLAY_FURNITURE',
        location: 'Lorong 2',
        purchaseDate: '2026-10-02',
        purchasePrice: 2000000,
        fundingSource: 'RESERVE_CAPITAL',
        postToLedger: true,
      });

      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.anything(),
        expect.anything(),
        [
          { accountCode: '1510', type: 'DEBIT', amount: 2000000 },
          { accountCode: '3020', type: 'CREDIT', amount: 2000000 },
        ],
        expect.anything(),
        expect.any(Date)
      );
    });

    it('tidak boleh memposting jurnal jika postToLedger bernilai false', async () => {
      (prisma.coopAsset.count as jest.Mock).mockResolvedValue(0);
      (prisma.coopAsset.create as jest.Mock).mockResolvedValue({
        id: 'asset-3',
        purchasePrice: 1000000,
      });

      await AssetService.createAsset(mockTenantId, {
        name: 'Kipas Angin Dinding',
        category: 'EQUIPMENT',
        location: 'Gudang',
        purchaseDate: '2026-10-03',
        purchasePrice: 1000000,
        postToLedger: false,
      });

      expect(AccountingService.createJournalEntry).not.toHaveBeenCalled();
    });
  });

  describe('3. Straight-Line Depreciation Engine (Phase 4 & 5)', () => {
    it('harus menghitung depresiasi bulanan secara presisi dengan metode garis lurus (Straight-Line)', async () => {
      // Mock existing journal = null (belum pernah disusutkan bulan ini)
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue(null);

      // Asset 1: Price 12.000.000, Salvage 0, Useful 48 mo -> 250.000 / mo
      // Asset 2: Price 7.000.000, Salvage 1.000.000, Useful 24 mo -> (6.000.000 / 24) = 250.000 / mo
      const mockAssets = [
        {
          code: 'AST-KOP-2026-0001',
          name: 'Freezer Es Krim',
          purchasePrice: 12000000,
          salvageValue: 0,
          usefulLifeMonths: 48,
          status: 'IN_USE',
        },
        {
          code: 'AST-KOP-2026-0002',
          name: 'Komputer POS Kasir',
          purchasePrice: 7000000,
          salvageValue: 1000000,
          usefulLifeMonths: 24,
          status: 'IN_USE',
        },
      ];
      (prisma.coopAsset.findMany as jest.Mock).mockResolvedValue(mockAssets);

      const result = await AssetService.runMonthlyDepreciation(mockTenantId, 2026, 10);

      expect(result.period).toBe('2026-10');
      expect(result.voucherNumber).toBe('AJP-DEP-202610');
      expect(result.assetCount).toBe(2);
      expect(result.totalDepreciation).toBe(500000); // 250.000 + 250.000

      // Memverifikasi penjurnalan Akuntansi: Debit Beban Penyusutan (5030), Kredit Akumulasi Penyusutan (1520)
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Penyusutan Aktiva Tetap Koperasi Periode 2026-10 (2 aset)'),
        'AJP-DEP-202610',
        [
          { accountCode: '5030', amount: 500000, type: 'DEBIT' },
          { accountCode: '1520', amount: 500000, type: 'CREDIT' },
        ],
        expect.anything(),
        expect.any(Date)
      );
    });

    it('harus menolak eksekusi ganda pada bulan yang sama (Idempotency Guard)', async () => {
      // Mock sudah pernah diposting untuk voucher AJP-DEP-202610
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue({
        id: 'journal-exist',
        reference: 'AJP-DEP-202610'
      });

      await expect(
        AssetService.runMonthlyDepreciation(mockTenantId, 2026, 10)
      ).rejects.toThrow('sudah pernah diposting');

      expect(AccountingService.createJournalEntry).not.toHaveBeenCalled();
    });

    it('harus menangani kasus di mana tidak ada aset aktif yang memerlukan penyusutan', async () => {
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.coopAsset.findMany as jest.Mock).mockResolvedValue([]);

      const result = await AssetService.runMonthlyDepreciation(mockTenantId, 2026, 10);

      expect(result.assetCount).toBe(0);
      expect(result.totalDepreciation).toBe(0);
      expect(AccountingService.createJournalEntry).not.toHaveBeenCalled();
    });
  });

  describe('4. Historical Asset Sync to Balance Sheet (Idempotent)', () => {
    it('harus menyinkronkan aset yang belum memiliki entri jurnal ke Neraca', async () => {
      const mockAssets = [
        { code: 'AST-KOP-2025-0001', name: 'Gedung Koperasi', purchasePrice: 50000000, purchaseDate: new Date() },
        { code: 'AST-KOP-2025-0002', name: 'Meja Rapat', purchasePrice: 5000000, purchaseDate: new Date() },
      ];
      (prisma.coopAsset.findMany as jest.Mock).mockResolvedValue(mockAssets);

      // Gedung sudah ada jurnalnya, Meja Rapat belum ada
      (prisma.journal.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'j-1' }) // untuk AST-KOP-2025-0001
        .mockResolvedValueOnce(null);          // untuk AST-KOP-2025-0002

      const result = await AssetService.syncExistingAssetsToJournal(mockTenantId);

      expect(result.syncedCount).toBe(1);
      expect(result.totalSyncedValue).toBe(5000000);
      expect(AccountingService.createJournalEntry).toHaveBeenCalledTimes(1);
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Meja Rapat'),
        'AST-AST-KOP-2025-0002',
        [
          { accountCode: '1510', type: 'DEBIT', amount: 5000000 },
          { accountCode: '3020', type: 'CREDIT', amount: 5000000 },
        ],
        expect.anything(),
        expect.any(Date)
      );
    });
  });

  describe('5. Asset Deletion & Ledger Cleanup', () => {
    it('harus menghapus aset beserta entri jurnal pengadaannya secara atomik', async () => {
      (prisma.coopAsset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-del-1',
        code: 'AST-KOP-2026-0009',
        name: 'Dispenser Rusak',
      });
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue({
        id: 'journal-del-1',
      });

      const success = await AssetService.deleteAsset(mockTenantId, 'asset-del-1');

      expect(success).toBe(true);
      expect(prisma.journalItem.deleteMany).toHaveBeenCalledWith({ where: { journalId: 'journal-del-1' } });
      expect(prisma.journal.delete).toHaveBeenCalledWith({ where: { id: 'journal-del-1' } });
      expect(prisma.coopAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-del-1' } });
    });
  });

  describe('6. Depreciation Status Checker', () => {
    it('harus mengembalikan isDepreciated = true saat voucher jurnal depresiasi ditemukan', async () => {
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue({
        id: 'journal-ajp',
        reference: 'AJP-DEP-202610',
        date: new Date('2026-10-28'),
        items: [
          { type: 'DEBIT', amount: 500000 },
          { type: 'CREDIT', amount: 500000 },
        ]
      });

      const status = await AssetService.getDepreciationStatus(mockTenantId, 2026, 10);

      expect(status.isDepreciated).toBe(true);
      expect(status.period).toBe('2026-10');
      expect(status.totalDepreciation).toBe(500000);
      expect(status.voucherNumber).toBe('AJP-DEP-202610');
    });

    it('harus mengembalikan isDepreciated = false saat belum ada voucher depresiasi', async () => {
      (prisma.journal.findFirst as jest.Mock).mockResolvedValue(null);

      const status = await AssetService.getDepreciationStatus(mockTenantId, 2026, 11);

      expect(status.isDepreciated).toBe(false);
      expect(status.totalDepreciation).toBe(0);
    });
  });
});
