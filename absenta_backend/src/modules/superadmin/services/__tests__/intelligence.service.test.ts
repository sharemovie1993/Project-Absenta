jest.mock('@/utils/prisma', () => ({
  prisma: {
    tenant: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    notificationLog: {
      groupBy: jest.fn(),
    },
    observabilityMetric: {
      groupBy: jest.fn(),
    },
    alertLog: {
      count: jest.fn(),
    },
    aggregatedMetricDaily: {
      findMany: jest.fn(),
    },
    absenGerbangSiswa: {
      count: jest.fn(),
    },
    absenSiswa: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/utils/prisma';
import { superadminIntelligenceService } from '../intelligence.service';

describe('superadminIntelligenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes overview stats and excludes system tenant', async () => {
    (prisma.tenant.count as jest.Mock)
      .mockResolvedValueOnce(2) // totalTenants
      .mockResolvedValueOnce(2) // activeTenants
      .mockResolvedValueOnce(0); // suspendedTenants

    (prisma.subscription.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { price_snapshot: 250000, Plan: { price_monthly: 200000, price_yearly: null, billing_period: 'MONTH' } },
        { price_snapshot: null, Plan: { price_monthly: 150000, price_yearly: null, billing_period: 'MONTH' } },
      ])
      .mockResolvedValueOnce([
        { tenant_id: 't1', status: 'ACTIVE', end_date: new Date(Date.now() + 86400_000) },
      ]);

    (prisma.subscription.count as jest.Mock).mockResolvedValueOnce(0);
    (prisma.tenant.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 't1', name: 'SMKN 1 PLERED', status: 'ACTIVE', deletion_requested_at: null },
      { id: 't2', name: 'Portal Demo', status: 'ACTIVE', deletion_requested_at: null },
    ]);
    (prisma.notificationLog.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const overview = await superadminIntelligenceService.getOverview();

    expect(overview.totalTenants).toBe(2);
    expect(overview.activeTenants).toBe(2);
    expect(overview.suspendedTenants).toBe(0);
    expect(overview.totalMRR).toBe(400000);
    expect(overview.churnLast30Days).toBe(0);
    expect(overview.avgRiskScore).toBe(7.5);
  });

  it('returns sorted top risk tenants', async () => {
    (prisma.tenant.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 't1', name: 'Healthy School', status: 'ACTIVE', deletion_requested_at: null },
      { id: 't2', name: 'Suspended School', status: 'SUSPENDED', deletion_requested_at: null },
    ]);
    (prisma.subscription.findMany as jest.Mock).mockResolvedValueOnce([
      { tenant_id: 't1', status: 'ACTIVE', end_date: new Date(Date.now() + 86400_000) },
      { tenant_id: 't2', status: 'EXPIRED', end_date: new Date(Date.now() - 86400_000) },
    ]);
    (prisma.notificationLog.groupBy as jest.Mock).mockResolvedValueOnce([]);

    const topRisk = await superadminIntelligenceService.getTopRisk();

    expect(topRisk).toHaveLength(2);
    expect(topRisk[0].tenantId).toBe('t2');
    expect(topRisk[0].riskLevel).toBe('CRITICAL');
    expect(topRisk[1].tenantId).toBe('t1');
    expect(topRisk[1].riskLevel).toBe('HEALTHY');
  });
});
