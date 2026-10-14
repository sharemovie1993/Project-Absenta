import { TokoService } from '../toko.service';
import { prisma } from '@/utils/prisma';
import { ProductCategoryService } from '../product-category.service';
import { AccountingService } from '../../laporan/accounting.service';
import { activityLogService } from '../../../activity/services/activity-log.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    saleItem: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    coopStockInItem: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      return callback({
        product: {
          update: prisma.product.update,
        },
      });
    }),
  },
}));

jest.mock('../product-category.service', () => ({
  ProductCategoryService: {
    ensureCategoryExists: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../laporan/accounting.service', () => ({
  AccountingService: {
    getOrCreateDefaultAccounts: jest.fn().mockResolvedValue(true),
    createJournalEntry: jest.fn().mockResolvedValue({ id: 'journal-stock-adj-1' }),
  },
}));

jest.mock('../../../activity/services/activity-log.service', () => ({
  activityLogService: {
    logEvent: jest.fn(),
  },
}));

jest.mock('@/utils/cache-invalidation.service', () => ({
  cacheInvalidationService: {
    invalidateKoperasiCache: jest.fn().mockResolvedValue(true),
  },
}));

describe('TokoService - Katalog Barang / Products Unit Tests (Phase 3 TDD & Phase 5 QA)', () => {
  const mockTenantId = 'tenant-product-test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. getProducts & getProductById', () => {
    it('harus mengambil daftar produk berdasarkan tenantId dan mengurutkannya berdasarkan nama', async () => {
      const mockList = [
        { id: 'p-1', name: 'Buku Gambar', price: 5000, stock: 20 },
        { id: 'p-2', name: 'Pensil 2B', price: 3000, stock: 50 },
      ];
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockList);

      const result = await TokoService.getProducts(mockTenantId);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('harus memfilter produk berdasarkan kata kunci pencarian (name atau code)', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      await TokoService.getProducts(mockTenantId, 'pensil');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          OR: [
            { name: { contains: 'pensil', mode: 'insensitive' } },
            { code: { contains: 'pensil', mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    });

    it('harus mengambil produk spesifik berdasarkan ID dan tenantId', async () => {
      const mockItem = { id: 'p-1', tenantId: mockTenantId, name: 'Buku Tulis' };
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockItem);

      const result = await TokoService.getProductById('p-1', mockTenantId);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-1', tenantId: mockTenantId },
      });
      expect(result?.name).toBe('Buku Tulis');
    });
  });

  describe('2. createProduct', () => {
    it('harus menolak pembuatan produk jika nama kosong', async () => {
      await expect(
        TokoService.createProduct(mockTenantId, { name: '', price: 1000 })
      ).rejects.toThrow('Nama produk wajib diisi.');
    });

    it('harus menolak jika harga produk negatif', async () => {
      await expect(
        TokoService.createProduct(mockTenantId, { name: 'Barang A', price: -500 })
      ).rejects.toThrow('Harga produk tidak boleh negatif.');
    });

    it('harus menolak jika stok awal bernilai negatif', async () => {
      await expect(
        TokoService.createProduct(mockTenantId, { name: 'Barang B', price: 1000, stock: -2 })
      ).rejects.toThrow('Stok produk tidak boleh negatif.');
    });

    it('harus memastikan kategori produk ada, membuat record produk, mencatat audit log, dan menginvalidasi cache', async () => {
      const input = {
        code: 'ATK-001',
        name: 'Map Folio Kertas',
        price: '2500',
        costPrice: '1500',
        stock: '100',
        minStock: '10',
        category: 'ATK',
        unit: 'pcs',
      };

      const createdMock = {
        id: 'prod-new-1',
        tenantId: mockTenantId,
        ...input,
        price: 2500,
        costPrice: 1500,
        stock: 100,
        minStock: 10,
      };

      (prisma.product.create as jest.Mock).mockResolvedValue(createdMock);

      const result = await TokoService.createProduct(mockTenantId, input, 'user-admin-1');

      expect(ProductCategoryService.ensureCategoryExists).toHaveBeenCalledWith(mockTenantId, 'ATK');
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            name: 'Map Folio Kertas',
            price: 2500,
            stock: 100,
          }),
        })
      );
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_PRODUCT_CREATED',
          tenant_id: mockTenantId,
          entity: 'Product',
          entity_id: 'prod-new-1',
        })
      );
      expect(cacheInvalidationService.invalidateKoperasiCache).toHaveBeenCalledWith(mockTenantId);
      expect(result.id).toBe('prod-new-1');
    });
  });

  describe('3. updateProduct', () => {
    it('harus menolak update jika harga atau stok negatif', async () => {
      await expect(
        TokoService.updateProduct('p-1', { price: -100 })
      ).rejects.toThrow('Harga produk tidak boleh negatif.');

      await expect(
        TokoService.updateProduct('p-1', { stock: -5 })
      ).rejects.toThrow('Stok produk tidak boleh negatif.');
    });

    it('harus melempar error jika produk yang akan diupdate tidak ditemukan', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        TokoService.updateProduct('p-nonexistent', { name: 'Baru' })
      ).rejects.toThrow('Produk tidak ditemukan.');
    });

    it('harus berhasil memperbarui data produk, mencatat histori perubahan audit, dan menginvalidasi cache', async () => {
      const existingProduct = {
        id: 'p-1',
        tenantId: mockTenantId,
        name: 'Penggaris 30cm',
        code: 'PGR-30',
        price: 4000,
        costPrice: 2500,
        stock: 25,
        category: 'ATK',
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...existingProduct,
        price: 5000,
      });

      const updated = await TokoService.updateProduct('p-1', { price: 5000 }, 'user-operator-1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({ price: 5000 }),
      });
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_PRODUCT_UPDATED',
          tenant_id: mockTenantId,
          entity: 'Product',
          entity_id: 'p-1',
        })
      );
      expect(cacheInvalidationService.invalidateKoperasiCache).toHaveBeenCalledWith(mockTenantId);
      expect(updated.price).toBe(5000);
    });
  });

  describe('4. deleteProduct (Data Integrity Guard)', () => {
    it('harus melempar error jika produk yang akan dihapus tidak ditemukan', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        TokoService.deleteProduct('p-999')
      ).rejects.toThrow('Produk tidak ditemukan.');
    });

    it('harus menolak penghapusan produk jika sudah memiliki riwayat penjualan untuk menjaga integritas laporan', async () => {
      const existingProduct = {
        id: 'p-sold',
        tenantId: mockTenantId,
        name: 'Seragam Pramuka',
        code: 'SRG-01',
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.saleItem.count as jest.Mock).mockResolvedValue(5); // Sudah pernah terjual 5 kali

      await expect(
        TokoService.deleteProduct('p-sold')
      ).rejects.toThrow('Produk tidak bisa dihapus karena sudah memiliki 5 riwayat penjualan');
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('harus berhasil menghapus produk jika belum pernah ada transaksi penjualan', async () => {
      const existingProduct = {
        id: 'p-fresh',
        tenantId: mockTenantId,
        name: 'Produk Baru Tanpa Penjualan',
        code: 'NEW-01',
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.saleItem.count as jest.Mock).mockResolvedValue(0);
      (prisma.product.delete as jest.Mock).mockResolvedValue(existingProduct);

      const deleted = await TokoService.deleteProduct('p-fresh', 'user-admin-1');

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p-fresh' } });
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_PRODUCT_DELETED',
          tenant_id: mockTenantId,
          entity: 'Product',
          entity_id: 'p-fresh',
        })
      );
      expect(cacheInvalidationService.invalidateKoperasiCache).toHaveBeenCalledWith(mockTenantId);
      expect(deleted.id).toBe('p-fresh');
    });
  });

  describe('5. adjustStock (Stock Opname & Accounting Integration)', () => {
    it('harus menolak penyesuaian jika stok baru bernilai negatif', async () => {
      await expect(
        TokoService.adjustStock(mockTenantId, 'p-1', -1)
      ).rejects.toThrow('Stok tidak boleh negatif.');
    });

    it('harus melempar error jika produk tidak ditemukan', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        TokoService.adjustStock(mockTenantId, 'p-none', 10)
      ).rejects.toThrow('Product not found');
    });

    it('harus menyesuaikan stok dan membuat jurnal akuntansi penyesuaian persediaan saat terjadi selisih stok', async () => {
      const existingProduct = {
        id: 'p-adj',
        tenantId: mockTenantId,
        name: 'Penghapus Papan',
        code: 'PHP-01',
        stock: 10,
        costPrice: 5000,
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...existingProduct,
        stock: 15,
      });

      const result = await TokoService.adjustStock(
        mockTenantId,
        'p-adj',
        15,
        'Ditemukan stok ekstra di gudang',
        'operator-1'
      );

      expect(AccountingService.getOrCreateDefaultAccounts).toHaveBeenCalledWith(mockTenantId);
      expect(AccountingService.createJournalEntry).toHaveBeenCalledWith(
        mockTenantId,
        expect.stringContaining('Ditemukan stok ekstra di gudang'),
        expect.stringContaining('STK-ADJ-p-adj'),
        expect.arrayContaining([
          expect.objectContaining({ accountCode: '1030', type: 'DEBIT', amount: 25000 }),
          expect.objectContaining({ accountCode: '5020', type: 'CREDIT', amount: 25000 }),
        ]),
        expect.anything()
      );
      expect(activityLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'COOP_PRODUCT_ADJUST_STOCK',
          tenant_id: mockTenantId,
          entity: 'Product',
          entity_id: 'p-adj',
        })
      );
      expect(cacheInvalidationService.invalidateKoperasiCache).toHaveBeenCalledWith(mockTenantId);
      expect(result.stock).toBe(15);
    });
  });
});
