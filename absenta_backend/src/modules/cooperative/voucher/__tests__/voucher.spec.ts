import { VoucherService, clearVoucherMemoryCache } from '../voucher.service';
import { prisma } from '@/utils/prisma';

// Mock Prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    voucher: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('Voucher & Promo Koperasi - Phase 3 Enterprise Unit Tests', () => {
  const mockTenantId = 'tenant-voucher-test';

  beforeEach(() => {
    jest.clearAllMocks();
    clearVoucherMemoryCache();
  });

  describe('1. Get Vouchers (getVouchers)', () => {
    it('harus mengambil seluruh voucher aktif untuk tenant jika memberId tidak ditentukan', async () => {
      const mockVouchers = [
        { id: 'v-1', code: 'PROMO10', discount: 10000, isActive: true },
        { id: 'v-2', code: 'DISKON5', discount: 5000, isActive: true },
      ];
      (prisma.voucher.findMany as jest.Mock).mockResolvedValue(mockVouchers);

      const result = await VoucherService.getVouchers(mockTenantId);

      expect(result).toHaveLength(2);
      expect(prisma.voucher.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('harus memfilter voucher personal milik member atau publik (memberId: null)', async () => {
      (prisma.voucher.findMany as jest.Mock).mockResolvedValue([]);

      await VoucherService.getVouchers(mockTenantId, 'member-123');

      expect(prisma.voucher.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true,
          OR: [
            { memberId: null },
            { memberId: 'member-123' }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('2. Create Voucher (createVoucher)', () => {
    it('harus membersihkan spasi, membuat kode huruf besar (uppercase), dan menyimpan nominal diskon numerik', async () => {
      const input = {
        code: '  hemat20  ',
        discount: '20000',
        description: '  Promo Belanja Hemat  ',
        validUntil: '2026-12-31T23:59:59.000Z',
        memberId: null
      };

      (prisma.voucher.create as jest.Mock).mockResolvedValue({
        id: 'v-new',
        tenantId: mockTenantId,
        code: 'HEMAT20',
        discount: 20000,
        description: 'Promo Belanja Hemat',
        validUntil: new Date('2026-12-31T23:59:59.000Z'),
        isActive: true
      });

      const result = await VoucherService.createVoucher(mockTenantId, input);

      expect(result.code).toBe('HEMAT20');
      expect(prisma.voucher.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          code: 'HEMAT20',
          discount: 20000,
          description: 'Promo Belanja Hemat',
          validUntil: expect.any(Date),
          memberId: null,
          isActive: true
        }
      });
    });
  });

  describe('3. Delete Voucher (deleteVoucher)', () => {
    it('harus menghapus voucher jika ditemukan untuk tenant yang bersangkutan', async () => {
      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        id: 'v-to-delete',
        tenantId: mockTenantId,
        code: 'EXPIRED10'
      });
      (prisma.voucher.delete as jest.Mock).mockResolvedValue({ id: 'v-to-delete' });

      const result = await VoucherService.deleteVoucher(mockTenantId, 'v-to-delete');

      expect(result.id).toBe('v-to-delete');
      expect(prisma.voucher.delete).toHaveBeenCalledWith({
        where: { id: 'v-to-delete' }
      });
    });

    it('harus melempar error jika voucher tidak ditemukan pada tenant ini', async () => {
      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        VoucherService.deleteVoucher(mockTenantId, 'v-unknown')
      ).rejects.toThrow('Voucher tidak ditemukan');

      expect(prisma.voucher.delete).not.toHaveBeenCalled();
    });
  });

  describe('4. Validate Voucher (validateVoucher)', () => {
    it('harus mengembalikan voucher jika kode aktif dan belum kedaluwarsa', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        id: 'v-valid',
        tenantId: mockTenantId,
        code: 'PROMO2026',
        discount: 15000,
        validUntil: futureDate,
        isActive: true
      });

      const voucher = await VoucherService.validateVoucher(mockTenantId, ' promo2026 ');

      expect(voucher.code).toBe('PROMO2026');
      expect(prisma.voucher.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          code: 'PROMO2026',
          isActive: true
        }
      });
    });

    it('harus melempar error jika voucher tidak ditemukan atau tidak aktif', async () => {
      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        VoucherService.validateVoucher(mockTenantId, 'INVALID')
      ).rejects.toThrow('Voucher tidak ditemukan atau sudah tidak aktif.');
    });

    it('harus melempar error jika masa berlaku voucher sudah lewat (expired)', async () => {
      const pastDate = new Date('2020-01-01');

      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        id: 'v-expired',
        tenantId: mockTenantId,
        code: 'KADALUWARSA',
        validUntil: pastDate,
        isActive: true
      });

      await expect(
        VoucherService.validateVoucher(mockTenantId, 'KADALUWARSA')
      ).rejects.toThrow('Masa berlaku voucher ini sudah habis.');
    });

    it('harus melempar error jika voucher adalah voucher eksklusif milik anggota lain', async () => {
      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        id: 'v-member-exclusive',
        tenantId: mockTenantId,
        code: 'VIPANGGOTA',
        memberId: 'member-owner-abc',
        isActive: true
      });

      await expect(
        VoucherService.validateVoucher(mockTenantId, 'VIPANGGOTA', 'member-stranger-xyz')
      ).rejects.toThrow('Voucher ini hanya dapat digunakan oleh anggota pemiliknya.');
    });

    it('harus berhasil jika voucher personal digunakan oleh pemilik aslinya', async () => {
      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        id: 'v-member-exclusive',
        tenantId: mockTenantId,
        code: 'VIPANGGOTA',
        memberId: 'member-owner-abc',
        isActive: true
      });

      const voucher = await VoucherService.validateVoucher(mockTenantId, 'VIPANGGOTA', 'member-owner-abc');
      expect(voucher.id).toBe('v-member-exclusive');
    });
  });

  describe('5. In-Memory Caching & Invalidation (Phase 4 Hardening)', () => {
    it('harus melayani query berikutnya dari in-memory cache tanpa memanggil Prisma ulang', async () => {
      const mockVouchers = [
        { id: 'v-cache-1', code: 'HEMAT10', discount: 10000, isActive: true }
      ];
      (prisma.voucher.findMany as jest.Mock).mockResolvedValue(mockVouchers);

      // Panggilan pertama: Hit Prisma
      const firstCall = await VoucherService.getVouchers(mockTenantId);
      expect(firstCall).toEqual(mockVouchers);
      expect(prisma.voucher.findMany).toHaveBeenCalledTimes(1);

      // Panggilan kedua: Dari In-Memory Cache (Prisma tidak boleh dipanggil lagi)
      const secondCall = await VoucherService.getVouchers(mockTenantId);
      expect(secondCall).toEqual(mockVouchers);
      expect(prisma.voucher.findMany).toHaveBeenCalledTimes(1);
    });

    it('harus menginvalida in-memory cache ketika voucher baru dibuat', async () => {
      const mockVouchers = [
        { id: 'v-cache-1', code: 'HEMAT10', discount: 10000, isActive: true }
      ];
      (prisma.voucher.findMany as jest.Mock).mockResolvedValue(mockVouchers);

      await VoucherService.getVouchers(mockTenantId);
      expect(prisma.voucher.findMany).toHaveBeenCalledTimes(1);

      // Buat voucher baru -> cache harus otomatis terhapus
      (prisma.voucher.create as jest.Mock).mockResolvedValue({
        id: 'v-new-2',
        tenantId: mockTenantId,
        code: 'PROMO20',
        discount: 20000,
        isActive: true
      });
      await VoucherService.createVoucher(mockTenantId, {
        code: 'PROMO20',
        discount: 20000
      });

      // Panggilan berikutnya harus memanggil Prisma lagi
      await VoucherService.getVouchers(mockTenantId);
      expect(prisma.voucher.findMany).toHaveBeenCalledTimes(2);
    });

    it('harus menginvalida in-memory cache ketika voucher dihapus', async () => {
      const mockVouchers = [
        { id: 'v-cache-1', code: 'HEMAT10', discount: 10000, isActive: true }
      ];
      (prisma.voucher.findMany as jest.Mock).mockResolvedValue(mockVouchers);

      await VoucherService.getVouchers(mockTenantId);
      expect(prisma.voucher.findMany).toHaveBeenCalledTimes(1);

      // Hapus voucher -> cache harus otomatis terhapus
      (prisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        id: 'v-cache-1',
        tenantId: mockTenantId,
        code: 'HEMAT10'
      });
      (prisma.voucher.delete as jest.Mock).mockResolvedValue({ id: 'v-cache-1' });

      await VoucherService.deleteVoucher(mockTenantId, 'v-cache-1');

      // Panggilan berikutnya harus memanggil Prisma lagi
      await VoucherService.getVouchers(mockTenantId);
      expect(prisma.voucher.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
