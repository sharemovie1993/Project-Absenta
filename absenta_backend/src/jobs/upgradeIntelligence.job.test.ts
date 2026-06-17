import { runUpgradeIntelligenceCycle } from './upgradeIntelligence.job';
import { observabilityService } from '../modules/observability/services/observability.service';
import { upgradeIntelligenceService } from '../modules/upgrade-intelligence/services/upgradeIntelligence.service';

jest.mock('../utils/prisma', () => {
  return {
    prisma: {
      $transaction: jest.fn(),
      systemEventLog: {
        findFirst: jest.fn(),
      },
    },
  };
});

import { prisma } from '../utils/prisma';

describe('runUpgradeIntelligenceCycle deterministic locking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2026, 1, 20, 0, 0, 0, 0)));
    jest.spyOn(observabilityService, 'logEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('skips duplicate month for same monthKey', async () => {
    const tx: any = {
      upgradeIntelligenceJobLock: {
        create: jest.fn().mockResolvedValueOnce({ id: 'l1' }).mockRejectedValueOnce({ code: 'P2002' }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));

    (prisma.systemEventLog.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });

    const computeSpy = jest.spyOn(upgradeIntelligenceService, 'computeAndInsertMonthly').mockResolvedValue({
      month: '2026-01',
      tenants: 1,
      risk_cutoff_at: new Date(Date.UTC(2026, 1, 0, 23, 59, 59, 999)),
      funnel: { intent_count: 0, invoice_created_count: 0, invoice_paid_count: 0, upgrade_applied_count: 0, conversion_rate: 0 },
      anomalies: { high_intent_no_payment: [] },
    } as any);

    await runUpgradeIntelligenceCycle();
    await runUpgradeIntelligenceCycle();

    expect(computeSpy).toHaveBeenCalledTimes(1);
    expect(observabilityService.logEvent).not.toHaveBeenCalledWith(expect.objectContaining({ event_type: 'UPGRADE_INTELLIGENCE_SKIPPED' }));
  });
});
