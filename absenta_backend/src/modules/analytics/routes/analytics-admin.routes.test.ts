import { analyticsAdminRoutes } from './analytics-admin.routes';
import { revenueForecastService } from '../services/revenueForecast.service';
import { cohortService } from '../services/cohort.service';

jest.mock('@/utils/prisma', () => ({
  prisma: {},
}));

describe('analytics admin routes snapshot-only', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /revenue returns 404 when snapshot missing (no calculate)', async () => {
    const getLatestSpy = jest.spyOn(revenueForecastService, 'getLatestForecast').mockResolvedValue(null as any);
    const calculateSpy = jest.spyOn(revenueForecastService as any, 'calculateAndUpsertForecast');

    const routes: Record<string, any> = {};
    const fastify: any = {
      get: (path: string, opts: any) => {
        routes[path] = opts;
      },
    };

    await analyticsAdminRoutes(fastify);

    const reply: any = { status: jest.fn().mockReturnThis() };
    const res = await routes['/revenue'].handler({}, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(res?.code).toBe('SNAPSHOT_NOT_FOUND');
    expect(getLatestSpy).toHaveBeenCalled();
    expect(calculateSpy).not.toHaveBeenCalled();
  });

  test('GET /cohort returns 404 when snapshot missing (no calculate)', async () => {
    jest.spyOn(cohortService, 'getCohortRetention').mockResolvedValue([] as any);
    const calculateSpy = jest.spyOn(cohortService as any, 'calculateAndUpsertCohorts');

    const routes: Record<string, any> = {};
    const fastify: any = {
      get: (path: string, opts: any) => {
        routes[path] = opts;
      },
    };

    await analyticsAdminRoutes(fastify);

    const reply: any = { status: jest.fn().mockReturnThis() };
    const res = await routes['/cohort'].handler({ query: { limit: 24 } }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(res?.code).toBe('SNAPSHOT_NOT_FOUND');
    expect(calculateSpy).not.toHaveBeenCalled();
  });
});

