import { prisma } from '../../../utils/prisma';
import { appLogger } from '../../../utils/app-logger';
import { ObservabilityMetricType } from '@prisma/client';

function toUtcMinuteBucket(date: Date): Date {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  return d;
}

export class ObservabilityAggregationService {
  async incrementMetric(
    metricType: ObservabilityMetricType,
    tenantId: string | null,
    incrementValue = 1
  ): Promise<void> {
    const inc = Number.isFinite(incrementValue) && incrementValue !== 0 ? Math.trunc(incrementValue) : 0;
    if (inc === 0) return;

    const timeBucket = toUtcMinuteBucket(new Date());

    try {
      if (tenantId === null) {
        await prisma.$executeRaw`
          INSERT INTO "ObservabilityMetric" ("metric_type","tenant_id","time_bucket","value","created_at","updated_at")
          VALUES (${metricType}::"ObservabilityMetricType", NULL, ${timeBucket}, ${inc}, NOW(), NOW())
          ON CONFLICT ("metric_type","time_bucket") WHERE "tenant_id" IS NULL
          DO UPDATE SET
            "value" = "ObservabilityMetric"."value" + EXCLUDED."value",
            "updated_at" = NOW()
        `;
        return;
      }

      await prisma.$executeRaw`
        INSERT INTO "ObservabilityMetric" ("metric_type","tenant_id","time_bucket","value","created_at","updated_at")
        VALUES (${metricType}::"ObservabilityMetricType", ${tenantId}, ${timeBucket}, ${inc}, NOW(), NOW())
        ON CONFLICT ("metric_type","tenant_id","time_bucket")
        DO UPDATE SET
          "value" = "ObservabilityMetric"."value" + EXCLUDED."value",
          "updated_at" = NOW()
      `;
    } catch (err) {
      appLogger.warn({ err, metric_type: metricType, tenant_id: tenantId }, 'observability.incrementMetric_failed');
    }
  }
}

export const observabilityAggregationService = new ObservabilityAggregationService();

