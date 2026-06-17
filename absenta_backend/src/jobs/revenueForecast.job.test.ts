import { runRevenueForecastCycle } from './revenueForecast.job';
import { observabilityService } from '../modules/observability/services/observability.service';
import { revenueForecastService } from '../modules/analytics/services/revenueForecast.service';
import { cohortService } from '../modules/analytics/services/cohort.service';

jest.mock('../utils/prisma', () => {
  return {
    prisma: {
      $transaction: jest.fn(),
    },
  };
});

import { prisma } from '../utils/prisma';

describe('runRevenueForecastCycle deterministic locking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2026, 0, 15, 0, 0, 0, 0)));
    jest.spyOn(observabilityService, 'logEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('skips duplicate jobId for same month', async () => {
    const tx: any = {
      forecastJobLock: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 'l1' })
          .mockRejectedValueOnce({ code: 'P2002' }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    jest.spyOn(revenueForecastService, 'lockMonthIfExists').mockResolvedValue(true as any);
    const calcSpy = jest.spyOn(revenueForecastService, 'calculateAndUpsertForecast').mockResolvedValue({ month: new Date() } as any);
    jest.spyOn(cohortService, 'calculateAndUpsertCohorts').mockResolvedValue({ cohorts_processed: 1 } as any);

    await runRevenueForecastCycle();
    await runRevenueForecastCycle();

    expect(calcSpy).toHaveBeenCalledTimes(1);
    expect(observabilityService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'FORECAST_SKIPPED_DUPLICATE' })
    );
  });
});

