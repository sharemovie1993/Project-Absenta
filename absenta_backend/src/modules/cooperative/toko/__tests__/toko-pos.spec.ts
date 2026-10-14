import { TokoService } from '../toko.service';
import { prisma } from '@/utils/prisma';
import { AccountingService } from '../../laporan/accounting.service';
import { FiscalYearGuard } from '../../fiscal-year.guard';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    member: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    savingCategory: {
      findFirst: jest.fn(),
    },
    saving: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    savingTransaction: {
      create: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sale: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    saleItem: {
      count: jest.fn(),
    },
    voucher: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    coopPointTransaction: {
      create: jest.fn(),
    },
    shuPeriod: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      // Simulate transaction callback by passing tx (mocked prisma)
      return callback({
        product: {
          findUnique: prisma.product.findUnique,
          update: prisma.product.update,
        },
        voucher: {
          findFirst: prisma.voucher.findFirst,
          update: prisma.voucher.update,
        },
        saving: {
          findFirst: prisma.saving.findFirst,
          updateMany: prisma.saving.updateMany,
        },
        savingTransaction: {
          create: prisma.savingTransaction.create,
        },
        sale: {
          create: prisma.sale.create,
        },
        member: {
          update: prisma.member.update,
        },
        coopPointTransaction: {
          create: prisma.coopPointTransaction.create,
        },
      });
    }),
  },
}));

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    getOrCreateDefaultAccounts: jest.fn().mockResolvedValue(true),
    resolveAccountId: jest.fn().mockResolvedValue('acc-saving-id'),
    createJournalEntry: jest.fn().mockResolvedValue({ id: 'journal-123' }),
  },
}));

jest.mock('../../fiscal-year.guard', () => ({
  FiscalYearGuard: {
    validateNotClosed: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('TokoService - POS Kasir Toko Unit & Isolation Tests (Phase 3 & 5 QA)', () => {
  const mockTenantId = 'tenant-pos-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cash Checkout (processSale - CASH)', () => {
    it('harus berhasil memproses penjualan tunai, memotong stok, membuat jurnal, dan memberikan poin belanja', async () => {
      const mockProduct = {
        id: 'prod-1',
        tenantId: mockTenantId,
        name: 'Buku Tulis Sinar Dunia',
        price: 5000,
        costPrice: 3500,
        stock: 50,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.sale.create as jest.Mock).mockResolvedValue({
        id: 'sale-cash-001',
        tenantId: mockTenantId,
        memberId: 'member-001',
        total: 20000,
        paymentMethod: 'CASH',
        items: [
          { productId: 'prod-1', quantity: 4, price: 5000 }
        ],
      });

      const result = await TokoService.processSale(
        mockTenantId,
        'member-001',
        [{ productId: 'prod-1', quantity: 4 }],
        {
          paymentMethod: 'CASH',
          cashAmount: 50000,
          changeAmount: 30000,
          operatorId: 'operator-1',
        }
      );

      expect(FiscalYearGuard.validateNotClosed).toHaveBeenCalled();
      expect(AccountingService.getOrCreateDefaultAccounts).toHaveBeenCalledWith(mockTenantId);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 4 } },
      });
      expect(AccountingService.createJournalEntry).toHaveBeenCalledTimes(2); // POS-SALE & POS-COGS
      expect(result.id).toBe('sale-cash-001');
      expect(result.total).toBe(20000);
      // Member belanja 20.000 -> earn 2 points (1 pt per 10k)
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'member-001' },
        data: { points: { increment: 2 } },
      });
      expect(prisma.coopPointTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 'member-001',
            amount: 2,
            type: 'EARN_SHOPPING',
          }),
        })
      );
    });

    it('harus menolak transaksi jika keranjang belanja kosong', async () => {
      await expect(
        TokoService.processSale(mockTenantId, null, [])
      ).rejects.toThrow('Minimal satu produk harus dipilih.');
    });

    it('harus menolak transaksi jika kuantitas barang tidak valid atau kurang dari sama dengan 0', async () => {
      await expect(
        TokoService.processSale(mockTenantId, null, [{ productId: 'prod-1', quantity: 0 }])
      ).rejects.toThrow('Jumlah produk harus bilangan bulat positif');
    });
  });

  describe('2. Insufficient Stock Validation', () => {
    it('harus menolak checkout jika jumlah permintaan melebihi stok yang tersedia', async () => {
      const mockProduct = {
        id: 'prod-2',
        tenantId: mockTenantId,
        name: 'Penghapus Joyko',
        price: 2000,
        costPrice: 1200,
        stock: 3, // Hanya tersisa 3
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      await expect(
        TokoService.processSale(
          mockTenantId,
          null,
          [{ productId: 'prod-2', quantity: 5 }],
          { paymentMethod: 'CASH', cashAmount: 10000 }
        )
      ).rejects.toThrow('Stok tidak mencukupi untuk produk "Penghapus Joyko". Stok tersedia: 3, dibutuhkan: 5.');
    });

    it('harus menolak checkout jika produk tidak ditemukan di tenant ini', async () => {
      const foreignProduct = {
        id: 'prod-foreign',
        tenantId: 'other-tenant',
        name: 'Produk Luar',
        price: 10000,
        stock: 10,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(foreignProduct);

      await expect(
        TokoService.processSale(
          mockTenantId,
          null,
          [{ productId: 'prod-foreign', quantity: 1 }],
          { paymentMethod: 'CASH' }
        )
      ).rejects.toThrow('tidak ditemukan di tenant ini');
    });
  });

  describe('3. Saving Deduction Checkout (processSale - SAVING)', () => {
    const mockMember = {
      id: 'member-saving-1',
      userId: 'user-member-1',
      pin: '$2b$10$hashedpin...',
    };

    const mockSavingCategory = {
      id: 'cat-sukarela',
      code: 'SUKARELA',
      name: 'Simpanan Sukarela',
      accountCode: '2110',
    };

    it('harus menolak jika memberId tidak disediakan untuk metode SAVING', async () => {
      await expect(
        TokoService.processSale(
          mockTenantId,
          null,
          [{ productId: 'prod-1', quantity: 1 }],
          { paymentMethod: 'SAVING' }
        )
      ).rejects.toThrow('Anggota harus dipilih untuk pembayaran menggunakan simpanan.');
    });

    it('harus mencegah kasir melakukan self-checkout menggunakan simpanan milik sendiri', async () => {
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(mockMember);

      await expect(
        TokoService.processSale(
          mockTenantId,
          'member-saving-1',
          [{ productId: 'prod-1', quantity: 1 }],
          {
            paymentMethod: 'SAVING',
            operatorId: 'user-member-1', // Kasir sama dengan pemilik akun member
            pin: '123456',
          }
        )
      ).rejects.toThrow('Kasir tidak diperbolehkan melakukan pembayaran cashless (potong simpanan) pada akun milik sendiri');
    });

    it('harus menolak jika PIN transaksi koperasi salah', async () => {
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(mockMember);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        TokoService.processSale(
          mockTenantId,
          'member-saving-1',
          [{ productId: 'prod-1', quantity: 1 }],
          {
            paymentMethod: 'SAVING',
            operatorId: 'operator-other',
            pin: 'wrong-pin',
          }
        )
      ).rejects.toThrow('PIN Transaksi Koperasi salah');
    });

    it('harus menolak jika saldo simpanan sukarela tidak mencukupi', async () => {
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(mockMember);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue(mockSavingCategory);

      // Product senilai 50.000
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        tenantId: mockTenantId,
        name: 'Seragam Sekolah',
        price: 50000,
        costPrice: 40000,
        stock: 10,
      });

      // Saldo simpanan hanya 15.000
      (prisma.saving.findFirst as jest.Mock).mockResolvedValue({
        id: 'saving-rec-1',
        memberId: 'member-saving-1',
        amount: 15000,
      });

      await expect(
        TokoService.processSale(
          mockTenantId,
          'member-saving-1',
          [{ productId: 'prod-1', quantity: 1 }],
          {
            paymentMethod: 'SAVING',
            operatorId: 'operator-other',
            pin: 'correct-pin',
          }
        )
      ).rejects.toThrow('Saldo simpanan tidak mencukupi');
    });

    it('harus berhasil memotong saldo simpanan secara atomik dan mencatat transaksi penarikan', async () => {
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(mockMember);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.savingCategory.findFirst as jest.Mock).mockResolvedValue(mockSavingCategory);

      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        tenantId: mockTenantId,
        name: 'Buku Gambar',
        price: 10000,
        costPrice: 7000,
        stock: 10,
      });

      (prisma.saving.findFirst as jest.Mock).mockResolvedValue({
        id: 'saving-rec-1',
        memberId: 'member-saving-1',
        amount: 50000,
      });

      (prisma.saving.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.sale.create as jest.Mock).mockResolvedValue({
        id: 'sale-saving-001',
        tenantId: mockTenantId,
        memberId: 'member-saving-1',
        total: 10000,
        paymentMethod: 'SAVING',
      });

      const result = await TokoService.processSale(
        mockTenantId,
        'member-saving-1',
        [{ productId: 'prod-1', quantity: 1 }],
        {
          paymentMethod: 'SAVING',
          operatorId: 'operator-other',
          pin: 'correct-pin',
        }
      );

      expect(prisma.saving.updateMany).toHaveBeenCalledWith({
        where: { id: 'saving-rec-1', amount: { gte: 10000 } },
        data: { amount: { decrement: 10000 } },
      });
      expect(prisma.savingTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          savingId: 'saving-rec-1',
          amount: 10000,
          type: 'WITHDRAWAL',
        }),
      });
      expect(result.id).toBe('sale-saving-001');
    });
  });

  describe('4. Idempotency Key Caching & Mutex Guard', () => {
    it('harus mengembalikan data cached jika idempotencyKey yang sama dikirimkan kembali', async () => {
      const idempotencyKey = 'idem-pos-uuid-999';

      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        tenantId: mockTenantId,
        name: 'Item Uji',
        price: 15000,
        costPrice: 10000,
        stock: 20,
      });

      const initialSale = {
        id: 'sale-idem-first',
        total: 15000,
        paymentMethod: 'CASH',
      };
      (prisma.sale.create as jest.Mock).mockResolvedValue(initialSale);

      // Pemanggilan pertama: Eksekusi normal
      const firstRes = await TokoService.processSale(
        mockTenantId,
        null,
        [{ productId: 'prod-1', quantity: 1 }],
        { paymentMethod: 'CASH', cashAmount: 20000 },
        idempotencyKey
      );
      expect(firstRes.id).toBe('sale-idem-first');
      expect(prisma.sale.create).toHaveBeenCalledTimes(1);

      // Reset mock sale.create untuk membuktikan transaksi DB tidak dipanggil ulang
      (prisma.sale.create as jest.Mock).mockClear();

      // Pemanggilan kedua dengan idempotencyKey yang sama
      const secondRes = await TokoService.processSale(
        mockTenantId,
        null,
        [{ productId: 'prod-1', quantity: 1 }],
        { paymentMethod: 'CASH', cashAmount: 20000 },
        idempotencyKey
      );

      expect(secondRes.id).toBe('sale-idem-first');
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });
  });
});
