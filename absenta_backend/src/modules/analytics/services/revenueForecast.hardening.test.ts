import { Prisma } from '@prisma/client';
import { revenueForecastService } from './revenueForecast.service';
import { observabilityService } from '../../observability/services/observability.service';

describe('revenueForecastService hardening', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('counts only latest ACTIVE subscription per tenant and logs anomaly', async () => {
    jest.setSystemTime(new Date(Date.UTC(2026, 0, 15, 0, 0, 0, 0)));

    const logSpy = jest.spyOn(observabilityService, 'logEvent').mockImplementation(() => {});
    let upsertArgs: any = null;

    const db: any = {
      subscription: {
        findMany: jest.fn(async (args: any) => {
          if (args?.where?.status?.in) return [];
          return [
            {
              id: 's1',
              tenant_id: 't1',
              start_date: new Date(Date.UTC(2026, 0, 1)),
              price_snapshot: 100,
              Plan: null,
            },
            {
              id: 's2',
              tenant_id: 't1',
              start_date: new Date(Date.UTC(2026, 0, 10)),
              price_snapshot: 200,
              Plan: null,
            },
            {
              id: 's3',
              tenant_id: 't2',
              start_date: new Date(Date.UTC(2026, 0, 5)),
              price_snapshot: 50,
              Plan: null,
            },
          ];
        }),
      },
      revenue_snapshot_monthly: {
        findMany: jest.fn(async () => [
          { month: new Date(Date.UTC(2025, 11, 1)), upgrade_gain: 10, churn_amount: 0 },
          { month: new Date(Date.UTC(2025, 10, 1)), upgrade_gain: 10, churn_amount: 0 },
          { month: new Date(Date.UTC(2025, 9, 1)), upgrade_gain: 10, churn_amount: 0 },
        ]),
      },
      tenantRiskScore: {
        findMany: jest.fn(async () => []),
      },
      revenueForecastMonthly: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async (args: any) => {
          upsertArgs = args;
          return { ...args.create, calculated_at: new Date() };
        }),
      },
    };

    const month = new Date(Date.UTC(2026, 0, 1));
    await revenueForecastService.calculateAndUpsertForecast(db as Prisma.TransactionClient, month);

    const totalMrr = (upsertArgs?.create?.total_mrr as Prisma.Decimal).toNumber();
    expect(totalMrr).toBe(250);

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'FORECAST_ANOMALY_DOUBLE_ACTIVE',
        tenant_id: 't1',
      })
    );
  });

  test('rejects update for previous month snapshot', async () => {
    jest.setSystemTime(new Date(Date.UTC(2026, 1, 15, 0, 0, 0, 0)));
    jest.spyOn(observabilityService, 'logEvent').mockImplementation(() => {});

    const db: any = {
      revenueForecastMonthly: {
        findUnique: jest.fn(async () => ({ id: 'f1', month: new Date(Date.UTC(2026, 0, 1)), is_locked: false })),
      },
    };

    await expect(
      revenueForecastService.calculateAndUpsertForecast(db as Prisma.TransactionClient, new Date(Date.UTC(2026, 0, 1)))
    ).rejects.toThrow('FORECAST_IMMUTABLE_MONTH');
  });

  test('rejects update when snapshot month is locked', async () => {
    jest.setSystemTime(new Date(Date.UTC(2026, 1, 15, 0, 0, 0, 0)));
    jest.spyOn(observabilityService, 'logEvent').mockImplementation(() => {});

    const db: any = {
      revenueForecastMonthly: {
        findUnique: jest.fn(async () => ({ id: 'f1', month: new Date(Date.UTC(2026, 1, 1)), is_locked: true })),
      },
    };

    await expect(
      revenueForecastService.calculateAndUpsertForecast(db as Prisma.TransactionClient, new Date(Date.UTC(2026, 1, 1)))
    ).rejects.toThrow('FORECAST_LOCKED');
  });
});

