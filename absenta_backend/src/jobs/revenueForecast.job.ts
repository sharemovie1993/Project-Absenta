import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';
import { revenueForecastService } from '../modules/analytics/services/revenueForecast.service';
import { cohortService } from '../modules/analytics/services/cohort.service';
import { prisma } from '../utils/prisma';
import { defineCronJob } from '../infra/jobEngine';

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function addUtcMonths(monthStart: Date, months: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + months, 1));
}
function yyyyMm(monthStart: Date): string {
  return monthStart.toISOString().slice(0, 7);
}

export default defineCronJob({
  name: 'revenueForecast',
  schedule: '15 3 * * *', // jam 03:15 setiap hari
  envFlag: 'REVENUE_FORECAST_ENABLED',
  // cohort adalah sub-job yang dijalankan bersama dalam satu siklus
  subJobs: ['cohort'],
  async run() {
    const now = new Date();
    const correlationId = `cron-revenue-forecast-${now.toISOString().slice(0, 10)}`;
    const month = utcMonthStart(now);
    const jobId = `forecast-${yyyyMm(month)}`;

    appLogger.info({ correlation_id: correlationId }, 'revenueForecast.cycle_started');

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.forecastJobLock.create({ data: { job_id: jobId, month } });
      } catch (err: any) {
        if (err?.code === 'P2002') return { skippedDuplicate: true as const };
        throw err;
      }

      await revenueForecastService.lockMonthIfExists(tx, addUtcMonths(month, -1));
      const forecast = await revenueForecastService.calculateAndUpsertForecast(tx, month);
      const cohort = await cohortService.calculateAndUpsertCohorts(tx);
      return { skippedDuplicate: false as const, forecast, cohort };
    });

    if ((result as any).skippedDuplicate) {
      appLogger.info({ correlation_id: correlationId, job_id: jobId }, 'revenueForecast.skipped_duplicate');
      observabilityService.logEvent({
        event_type: 'FORECAST_SKIPPED_DUPLICATE',
        domain: 'CRON', severity: 'INFO', entity_type: 'JOB',
        entity_id: jobId, tenant_id: 'system', correlation_id: correlationId,
        metadata: { job: 'revenue-forecast', job_id: jobId, month: yyyyMm(month) },
      });
      return;
    }

    const { forecast, cohort } = result as any;
    appLogger.info(
      { correlation_id: correlationId, forecast_month: forecast.month, cohorts_processed: cohort.cohorts_processed },
      'revenueForecast.cycle_completed'
    );

    observabilityService.logEvent({
      event_type: 'UPGRADE_FUNNEL_COMPUTED',
      domain: 'CRON', severity: 'INFO', entity_type: 'UPGRADE_FUNNEL',
      entity_id: `upgrade-funnel-${yyyyMm(month)}`, tenant_id: 'system',
      correlation_id: correlationId,
      metadata: { month: yyyyMm(month), ...(forecast?.funnel || {}) },
    });
  },
});

/**
 * Jalankan satu siklus peramalan pendapatan.
 * Diekspor untuk backward compatibility dengan analytics.worker.ts
 */
export async function runRevenueForecastCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('revenueForecast');
}
