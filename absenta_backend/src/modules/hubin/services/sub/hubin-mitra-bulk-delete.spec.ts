import { HubinMitraService } from './hubin-mitra.service';
import { HubinService } from '../hubin.service';
import { bulkDeleteMitraSchema } from '../hubin.schema';
import { prisma } from '@/utils/prisma';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

// Mock dependencies
jest.mock('@/utils/prisma', () => ({
  prisma: {
    mitraIndustri: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    siswaPkl: {
      findMany: jest.fn(),
    },
    sertifikatUkk: {
      findFirst: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/utils/cache-invalidation.service', () => ({
  cacheInvalidationService: {
    invalidateHubinCache: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('HubinMitraService - Bulk Delete Mitra Industri', () => {
  let mitraService: HubinMitraService;
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockMitraIds = ['mitra-1', 'mitra-2'];

  beforeEach(() => {
    mitraService = new HubinMitraService();
    jest.clearAllMocks();
  });

  describe('bulkDeleteMitraSchema validation', () => {
    it('should validate valid list of IDs', () => {
      const result = bulkDeleteMitraSchema.safeParse({ ids: ['mitra-1', 'mitra-2'] });
      expect(result.success).toBe(true);
    });

    it('should fail when ids array is empty', () => {
      const result = bulkDeleteMitraSchema.safeParse({ ids: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('tidak boleh kosong');
      }
    });

    it('should fail when ids exceeds 100 items', () => {
      const excessiveIds = Array.from({ length: 101 }, (_, i) => `mitra-${i}`);
      const result = bulkDeleteMitraSchema.safeParse({ ids: excessiveIds });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Maksimal 100');
      }
    });
  });

  describe('bulkDeleteMitra business logic', () => {
    it('should return { count: 0 } when ids is empty', async () => {
      const result = await mitraService.bulkDeleteMitra(mockTenantId, []);
      expect(result).toEqual({ count: 0 });
      expect(prisma.mitraIndustri.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw an error if any of the target mitras have active PKL students', async () => {
      (prisma.siswaPkl.findMany as jest.Mock).mockResolvedValue([
        { id: 'pkl-1', status: 'AKTIF', Mitra: { nama: 'PT Solusi Bangsa' } },
      ]);

      await expect(
        mitraService.bulkDeleteMitra(mockTenantId, mockMitraIds, mockUserId)
      ).rejects.toThrow(/masih memiliki siswa PKL yang berstatus AKTIF/);

      expect(prisma.mitraIndustri.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw an error if any of the target mitras are linked to Sertifikat UKK', async () => {
      (prisma.siswaPkl.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sertifikatUkk.findFirst as jest.Mock).mockResolvedValue({
        id: 'ukk-1',
        MitraIndustri: { nama: 'PT Astra Motor' },
      });

      await expect(
        mitraService.bulkDeleteMitra(mockTenantId, mockMitraIds, mockUserId)
      ).rejects.toThrow(/terikat dengan data Sertifikat UKK/);

      expect(prisma.mitraIndustri.deleteMany).not.toHaveBeenCalled();
    });

    it('should successfully delete within tenant scope and invalidate cache', async () => {
      (prisma.siswaPkl.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sertifikatUkk.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.mitraIndustri.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await mitraService.bulkDeleteMitra(mockTenantId, mockMitraIds, mockUserId);

      expect(result).toEqual({ count: 2 });
      expect(prisma.mitraIndustri.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: mockMitraIds },
          tenant_id: mockTenantId,
        },
      });
      expect(cacheInvalidationService.invalidateHubinCache).toHaveBeenCalledWith(mockTenantId);
    });
  });

  describe('HubinService delegation', () => {
    it('should properly delegate bulkDeleteMitra to HubinMitraService', async () => {
      const hubinService = new HubinService();
      (prisma.siswaPkl.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sertifikatUkk.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.mitraIndustri.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await hubinService.bulkDeleteMitra(mockTenantId, ['id-1', 'id-2', 'id-3'], mockUserId);

      expect(result).toEqual({ count: 3 });
      expect(prisma.mitraIndustri.deleteMany).toHaveBeenCalled();
    });
  });
});
