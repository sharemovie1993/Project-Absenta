import { upgradeIntelligenceAdminRoutes } from './upgrade-intelligence-admin.routes';
import { upgradeIntelligenceService } from '../services/upgradeIntelligence.service';

jest.mock('@/utils/prisma', () => ({
  prisma: {},
}));

describe('upgrade intelligence admin routes snapshot-only', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /overview returns 404 when snapshot missing (no compute)', async () => {
    const getOverviewSpy = jest.spyOn(upgradeIntelligenceService, 'getOverview').mockResolvedValue(null as any);
    const computeSpy = jest.spyOn(upgradeIntelligenceService as any, 'computeAndInsertMonthly');

    const routes: Record<string, any> = {};
    const fastify: any = {
      get: (path: string, opts: any) => {
        routes[path] = opts;
      },
    };

    await upgradeIntelligenceAdminRoutes(fastify);

    const reply: any = { status: jest.fn().mockReturnThis() };
    const res = await routes['/overview'].handler({ query: {} }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(res?.code).toBe('SNAPSHOT_NOT_FOUND');
    expect(getOverviewSpy).toHaveBeenCalled();
    expect(computeSpy).not.toHaveBeenCalled();
  });

  test('GET /month/:month returns 404 when month not generated', async () => {
    jest.spyOn(upgradeIntelligenceService, 'getMonthSnapshot').mockResolvedValue(null as any);

    const routes: Record<string, any> = {};
    const fastify: any = {
      get: (path: string, opts: any) => {
        routes[path] = opts;
      },
    };

    await upgradeIntelligenceAdminRoutes(fastify);

    const reply: any = { status: jest.fn().mockReturnThis() };
    const res = await routes['/month/:month'].handler({ params: { month: '2026-02' } }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(res?.code).toBe('SNAPSHOT_NOT_FOUND');
  });
});

