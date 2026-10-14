import { SupplierService, clearSupplierMemoryCache } from '../supplier.service';
import { prisma } from '@/utils/prisma';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    coopSupplier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    coopStockIn: {
      findMany: jest.fn(),
    },
  },
}));

describe('Data Supplier Koperasi - Phase 3, 4, 5 Enterprise Audit & Unit Tests', () => {
  const mockTenantId = 'tenant-coop-supplier-test';

  beforeEach(() => {
    jest.clearAllMocks();
    clearSupplierMemoryCache();
  });

  describe('1. List Suppliers with Purchase Stats (findAll)', () => {
    it('harus mengambil supplier aktif dan menghitung total transaksi & nominal pembelian secara efisien', async () => {
      const mockDbSuppliers = [
        {
          id: 'sup-1',
          tenantId: mockTenantId,
          name: 'PT Indofood Sukses Makmur',
          contact: 'Pak Budi',
          phone: '081234567890',
          isActive: true,
          _count: { stockIns: 2 },
          stockIns: [
            {
              shippingFee: 15000,
              items: [
                { quantity: 10, costPrice: 3000 }, // 30.000
                { quantity: 5, costPrice: 4000 },  // 20.000
              ] // subtotal: 50.000 + 15.000 = 65.000
            },
            {
              shippingFee: 0,
              items: [
                { quantity: 20, costPrice: 2500 } // 50.000
              ] // subtotal: 50.000
            }
          ] // totalValue = 65.000 + 50.000 = 115.000
        },
        {
          id: 'sup-2',
          tenantId: mockTenantId,
          name: 'CV Beras Cianjur',
          contact: 'Ibu Siti',
          phone: '085711223344',
          isActive: true,
          _count: { stockIns: 0 },
          stockIns: []
        }
      ];

      (prisma.coopSupplier.findMany as jest.Mock).mockResolvedValue(mockDbSuppliers);

      const result = await SupplierService.findAll(mockTenantId, false);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('PT Indofood Sukses Makmur');
      expect(result[0].totalPurchases).toBe(2);
      expect(result[0].totalValue).toBe(115000);

      expect(result[1].name).toBe('CV Beras Cianjur');
      expect(result[1].totalPurchases).toBe(0);
      expect(result[1].totalValue).toBe(0);

      expect(prisma.coopSupplier.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true
        },
        include: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });

    it('harus menyertakan supplier nonaktif saat includeInactive = true', async () => {
      (prisma.coopSupplier.findMany as jest.Mock).mockResolvedValue([]);

      await SupplierService.findAll(mockTenantId, true);

      expect(prisma.coopSupplier.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId
        },
        include: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });
  });

  describe('2. Detail Supplier (findById)', () => {
    it('harus mengembalikan detail supplier lengkap dengan riwayat pasokan barang masuk', async () => {
      const mockSupplier = {
        id: 'sup-detail-1',
        tenantId: mockTenantId,
        name: 'Agen Minuman Segar',
        contact: 'Asep',
        stockIns: [
          {
            id: 'si-1',
            date: new Date('2026-10-01'),
            shippingFee: 10000,
            items: [
              { quantity: 100, costPrice: 1000, Product: { name: 'Teh Botol', code: 'PRD-01', unit: 'Pcs' } }
            ]
          }
        ]
      };

      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue(mockSupplier);

      const result = await SupplierService.findById('sup-detail-1', mockTenantId);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Agen Minuman Segar');
      expect(result?.totalPurchases).toBe(1);
      expect(result?.totalValue).toBe(110000); // 100 * 1000 + 10000
      expect(result?.stockIns).toHaveLength(1);
    });

    it('harus mengembalikan null jika supplier tidak ditemukan untuk tenant ini', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await SupplierService.findById('sup-unknown', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('3. Pendaftaran Supplier Baru (create)', () => {
    it('harus membersihkan spasi (trim) dan menyimpan supplier dengan status aktif secara default', async () => {
      const input = {
        name: '  Toko Sembako Barokah  ',
        contact: '  Haji Mahmud  ',
        phone: '  081987654321  ',
        email: '  barokah@toko.com  ',
        address: '  Jl. Raya Pasar No. 12  ',
        notes: '  Supplier beras dan minyak  '
      };

      (prisma.coopSupplier.create as jest.Mock).mockResolvedValue({
        id: 'sup-new-1',
        tenantId: mockTenantId,
        name: 'Toko Sembako Barokah',
        contact: 'Haji Mahmud',
        phone: '081987654321',
        email: 'barokah@toko.com',
        address: 'Jl. Raya Pasar No. 12',
        notes: 'Supplier beras dan minyak',
        isActive: true
      });

      const result = await SupplierService.create(mockTenantId, input);

      expect(result.id).toBe('sup-new-1');
      expect(prisma.coopSupplier.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          name: 'Toko Sembako Barokah',
          contact: 'Haji Mahmud',
          phone: '081987654321',
          email: 'barokah@toko.com',
          address: 'Jl. Raya Pasar No. 12',
          notes: 'Supplier beras dan minyak',
          isActive: true
        }
      });
    });
  });

  describe('4. Pembaruan Informasi Supplier (update)', () => {
    it('harus memperbarui data supplier yang ada', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'sup-upd-1',
        tenantId: mockTenantId,
        name: 'Toko Lama'
      });

      (prisma.coopSupplier.update as jest.Mock).mockResolvedValue({
        id: 'sup-upd-1',
        name: 'Toko Baru Terupdate',
        phone: '0811223344'
      });

      const updated = await SupplierService.update('sup-upd-1', mockTenantId, {
        name: '  Toko Baru Terupdate  ',
        phone: ' 0811223344 '
      });

      expect(updated.name).toBe('Toko Baru Terupdate');
      expect(prisma.coopSupplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-upd-1' },
        data: expect.objectContaining({
          name: 'Toko Baru Terupdate',
          phone: '0811223344'
        })
      });
    });

    it('harus melempar error jika supplier yang akan diupdate tidak ditemukan', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        SupplierService.update('sup-not-found', mockTenantId, { name: 'Any Name' })
      ).rejects.toThrow('Supplier tidak ditemukan');

      expect(prisma.coopSupplier.update).not.toHaveBeenCalled();
    });
  });

  describe('5. Penonaktifan Supplier / Soft Delete (delete)', () => {
    it('harus mengubah status isActive menjadi false tanpa menghapus record fisik (Soft Delete)', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'sup-del-1',
        tenantId: mockTenantId,
        isActive: true
      });

      (prisma.coopSupplier.update as jest.Mock).mockResolvedValue({
        id: 'sup-del-1',
        isActive: false
      });

      const result = await SupplierService.delete('sup-del-1', mockTenantId);

      expect(result.isActive).toBe(false);
      expect(prisma.coopSupplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-del-1' },
        data: { isActive: false }
      });
    });

    it('harus melempar error jika supplier yang akan dinonaktifkan tidak ada', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        SupplierService.delete('sup-del-none', mockTenantId)
      ).rejects.toThrow('Supplier tidak ditemukan');
    });
  });

  describe('6. Automatic Supplier Resolver (findOrCreate)', () => {
    it('harus mengembalikan supplier yang sudah ada jika ditemukan nama yang cocok (case-insensitive)', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'sup-existing',
        tenantId: mockTenantId,
        name: 'Grosir Maju Jaya'
      });

      const result = await SupplierService.findOrCreate(mockTenantId, ' grosir maju jaya ');

      expect(result.id).toBe('sup-existing');
      expect(prisma.coopSupplier.create).not.toHaveBeenCalled();
    });

    it('harus membuat supplier baru otomatis jika belum ada', async () => {
      (prisma.coopSupplier.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.coopSupplier.create as jest.Mock).mockResolvedValue({
        id: 'sup-auto-created',
        tenantId: mockTenantId,
        name: 'Distributor Sumber Makmur',
        isActive: true
      });

      const result = await SupplierService.findOrCreate(mockTenantId, ' Distributor Sumber Makmur ');

      expect(result.id).toBe('sup-auto-created');
      expect(prisma.coopSupplier.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          name: 'Distributor Sumber Makmur',
          isActive: true
        }
      });
    });
  });

  describe('7. In-Memory Caching & Invalidation (Fase 4 Hardening)', () => {
    it('harus menggunakan cache pada pemanggilan findAll berturut-turut tanpa query DB ulang', async () => {
      (prisma.coopSupplier.findMany as jest.Mock).mockResolvedValue([
        { id: 'sup-cache-1', name: 'Vendor Cepat', isActive: true, _count: { stockIns: 0 }, stockIns: [] }
      ]);

      const firstCall = await SupplierService.findAll(mockTenantId, false);
      const secondCall = await SupplierService.findAll(mockTenantId, false);

      expect(firstCall).toEqual(secondCall);
      expect(prisma.coopSupplier.findMany).toHaveBeenCalledTimes(1);
    });

    it('harus menginvalidasi cache saat terjadi mutasi (create/update/delete)', async () => {
      (prisma.coopSupplier.findMany as jest.Mock).mockResolvedValue([
        { id: 'sup-cache-1', name: 'Vendor Cepat', isActive: true, _count: { stockIns: 0 }, stockIns: [] }
      ]);

      await SupplierService.findAll(mockTenantId, false);
      expect(prisma.coopSupplier.findMany).toHaveBeenCalledTimes(1);

      // Trigger mutasi create
      (prisma.coopSupplier.create as jest.Mock).mockResolvedValue({ id: 'sup-new', tenantId: mockTenantId, name: 'Vendor Baru' });
      await SupplierService.create(mockTenantId, { name: 'Vendor Baru' });

      // Call findAll lagi, harus memanggil DB ulang karena cache sudah dibersihkan
      await SupplierService.findAll(mockTenantId, false);
      expect(prisma.coopSupplier.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
