
import { GuruService } from './guru.service';
import { prisma } from '@/utils/prisma';
import { DataScope } from '../../../../types/fastify';

// Mock Prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    guru: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('GuruService - Tenant Isolation Logic', () => {
  let service: GuruService;
  const mockTenantA = 'tenant-A';
  const mockGuruIdB = 'guru-id-from-tenant-B';

  beforeEach(() => {
    service = new GuruService();
    jest.clearAllMocks();
  });

  describe('getAllGuru', () => {
    it('should filter by tenant_id from scope', async () => {
      const scope: DataScope = { tenantId: mockTenantA, userId: 'user-1' };
      
      // Mock return
      (prisma.guru.count as jest.Mock).mockResolvedValue(0);
      (prisma.guru.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAllGuru(scope);

      // Verify Prisma was called with tenant_id constraint
      expect(prisma.guru.count).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: mockTenantA
        })
      }));

      expect(prisma.guru.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: mockTenantA
        })
      }));
    });
  });

  describe('getGuruById', () => {
    it('should apply tenant_id constraint when fetching by ID (Cross-Tenant Access Attempt)', async () => {
      const scope: DataScope = { tenantId: mockTenantA, userId: 'user-1' };
      
      // Scenario: User from Tenant A tries to access Guru ID from Tenant B
      // Mock return null (simulating not found because of filter)
      (prisma.guru.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getGuruById(mockGuruIdB, scope);

      // Verify logic: MUST include tenant_id in where clause
      expect(prisma.guru.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: mockGuruIdB,
          tenant_id: mockTenantA // CRITICAL: Must look for ID in Tenant A, not just by ID
        }
      }));

      expect(result).toBeNull();
    });
  });
});
