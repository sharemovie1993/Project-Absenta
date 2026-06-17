import { cacheService } from '@/utils/cache.service';

jest.mock('@/infra/redis/redisClient', () => ({
  getRedisConnection: () => {
    throw new Error('redis disabled in unit tests');
  },
}));

jest.mock('@/utils/prisma', () => ({
  prisma: {
    organizationalAssignment: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/utils/prisma';
import { organizationalAuthorizationEngine } from '../organizational-authorization.engine';

describe('OrganizationalAuthorizationEngine cache', () => {
  beforeEach(async () => {
    (cacheService as any).memoryCache?.clear?.();
    const g: any = globalThis as any;
    if (g.__cacheLocks?.clear) g.__cacheLocks.clear();
    (prisma.organizationalAssignment.findMany as jest.Mock).mockReset();
  });

  it('deduplicates concurrent resolveOrganizationalContext calls (single DB query)', async () => {
    (prisma.organizationalAssignment.findMany as jest.Mock).mockResolvedValue([
      {
        is_active: true,
        start_date: null,
        end_date: null,
        kelas_id: 'kelas-1',
        unit_id: null,
        Position: { id: 'pos-1', tenant_id: 't-1', code: 'WALIKELAS', name: 'Wali Kelas', scope_type: 'academic', unit_type: 'kelas' },
      },
    ]);

    const userId = 'user-1';
    const tasks = Array.from({ length: 100 }, () => organizationalAuthorizationEngine.resolveOrganizationalContext(userId));
    const results = await Promise.all(tasks);

    expect((prisma.organizationalAssignment.findMany as jest.Mock).mock.calls.length).toBe(1);
    for (const r of results) {
      expect(r.kelas_ids).toEqual(['kelas-1']);
      expect(r.tenant_wide).toBe(false);
      expect(r.positions.length).toBe(1);
    }
  });

  it('uses cached value on subsequent calls', async () => {
    (prisma.organizationalAssignment.findMany as jest.Mock).mockResolvedValue([]);
    const userId = 'user-2';

    await organizationalAuthorizationEngine.resolveOrganizationalContext(userId);
    await organizationalAuthorizationEngine.resolveOrganizationalContext(userId);

    expect((prisma.organizationalAssignment.findMany as jest.Mock).mock.calls.length).toBe(1);
  });
});
