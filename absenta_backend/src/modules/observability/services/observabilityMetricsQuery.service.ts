import { ObservabilityMetricType } from '@prisma/client';
import { prisma } from '../../../utils/prisma';

function toUtcMinuteBucket(date: Date): Date {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  return d;
}

export class ObservabilityMetricsQueryService {
  async getMetricSum(metricType: ObservabilityMetricType, tenantId: string | null, from: Date, to: Date): Promise<number> {
    const fromBucket = toUtcMinuteBucket(from);
    const toBucket = toUtcMinuteBucket(to);

    const res = await prisma.observabilityMetric.aggregate({
      where: {
        metric_type: metricType,
        ...(tenantId === null ? { tenant_id: null } : { tenant_id: tenantId }),
        time_bucket: { gte: fromBucket, lte: toBucket },
      },
      _sum: { value: true },
    });

    return Number(res._sum.value || 0);
  }

  async getTenantMetricRate(metricType: ObservabilityMetricType, tenantId: string, windowMinutes: number): Promise<number> {
    const minutes = Number.isFinite(windowMinutes) && windowMinutes > 0 ? Math.floor(windowMinutes) : 0;
    if (minutes === 0) return 0;

    const now = new Date();
    const from = new Date(now.getTime() - minutes * 60 * 1000);
    const sum = await this.getMetricSum(metricType, tenantId, from, now);
    return sum / minutes;
  }

  async getGlobalMetricRate(metricType: ObservabilityMetricType, windowMinutes: number): Promise<number> {
    const minutes = Number.isFinite(windowMinutes) && windowMinutes > 0 ? Math.floor(windowMinutes) : 0;
    if (minutes === 0) return 0;

    const now = new Date();
    const fromBucket = toUtcMinuteBucket(new Date(now.getTime() - minutes * 60 * 1000));
    const toBucket = toUtcMinuteBucket(now);

    const res = await prisma.observabilityMetric.aggregate({
      where: {
        metric_type: metricType,
        time_bucket: { gte: fromBucket, lte: toBucket },
      },
      _sum: { value: true },
    });

    return Number(res._sum.value || 0) / minutes;
  }
}

export const observabilityMetricsQueryService = new ObservabilityMetricsQueryService();

