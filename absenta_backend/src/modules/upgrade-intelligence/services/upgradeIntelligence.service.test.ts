import { upgradeIntelligenceService } from './upgradeIntelligence.service';

describe('upgradeIntelligenceService hardening', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('computeAndInsertMonthly writes snapshot without overwriting (create only)', async () => {
    const tenantIds = [{ id: 't1' }, { id: 't2' }];

    const tx: any = {
      tenant: { findMany: jest.fn().mockResolvedValue(tenantIds) },
      planChangeRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      tenantRiskScoreLog: { findMany: jest.fn().mockResolvedValue([]) },
      aggregatedMetricDaily: { groupBy: jest.fn().mockResolvedValue([]) },
      tenantUpgradeScoreMonthly: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      upgradeFunnelMonthly: { create: jest.fn().mockResolvedValue({ id: 'f1' }) },
    };

    await upgradeIntelligenceService.computeAndInsertMonthly(tx, '2026-02');

    expect(tx.tenantUpgradeScoreMonthly.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
    expect(tx.upgradeFunnelMonthly.create).toHaveBeenCalled();
    expect((tx as any).tenantUpgradeScoreMonthly.update).toBeUndefined();
    expect((tx as any).upgradeFunnelMonthly.update).toBeUndefined();
    expect((tx as any).upgradeFunnelMonthly.upsert).toBeUndefined();
  });
});
