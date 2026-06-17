import { prisma } from '../../../utils/prisma';
import { EMAIL_QUEUE_NAME } from '../../../queue/email.queue';
import { requireCapability } from '@/middlewares/requireCapability';

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

async function sumAggregated(metricKey: string, tenantId: string | null, since: Date, until: Date): Promise<number> {
  const todayUtc = utcDayStart(new Date());
  const effectiveUntil = until.getTime() > todayUtc.getTime() ? todayUtc : until;
  const fromDate = utcDayStart(since);
  const toDateExclusive = utcDayStart(effectiveUntil);

  if (toDateExclusive.getTime() <= fromDate.getTime()) return 0;

  const res = await prisma.aggregatedMetricDaily.aggregate({
    where: {
      metric_key: metricKey,
      ...(tenantId === null ? { tenant_id: null } : { tenant_id: tenantId }),
      date: { gte: fromDate, lt: toDateExclusive },
    },
    _sum: { value: true },
  });

  return Number(res._sum.value || 0);
}

export async function observabilityRoutes(fastify: any) {
  fastify.get('/overview', {
    preHandler: [requireCapability('superadmin.infra.monitoring.view')],
    handler: async (request: any, reply: any) => {
      const query = (request?.query || {}) as any;
      const tenantId = query?.tenant_id ? String(query.tenant_id) : null;
      const windowHoursRaw = query?.window_hours ? Number(query.window_hours) : null;
      const windowHours =
        typeof windowHoursRaw === 'number' && Number.isFinite(windowHoursRaw) && windowHoursRaw > 0
          ? Math.min(24 * 14, Math.max(1, Math.floor(windowHoursRaw)))
          : 24;

      const now = new Date();
      const since =
        query?.since && !Number.isNaN(new Date(String(query.since)).getTime())
          ? new Date(String(query.since))
          : new Date(now.getTime() - windowHours * 60 * 60 * 1000);
      const until =
        query?.until && !Number.isNaN(new Date(String(query.until)).getTime()) ? new Date(String(query.until)) : now;

      const timeWhere =
        until.getTime() > since.getTime() ? { gte: since, lt: until } : { gte: since };

      const USE_AGGREGATED_METRICS = (process.env.USE_AGGREGATED_METRICS || 'true').toLowerCase() === 'true';
      const windowDays = (until.getTime() - since.getTime()) / (24 * 60 * 60 * 1000);
      const shouldUseAggregated = USE_AGGREGATED_METRICS && windowDays > 7;

      if (shouldUseAggregated) {
        const [totalEvents, totalErrors, queueFailed, queueTerminal, emailFailed, emailTerminal, webhookFailed] = await Promise.all([
          sumAggregated('total_event_count', tenantId, since, until),
          sumAggregated('total_error_count', tenantId, since, until),
          sumAggregated('queue_failure_count', tenantId, since, until),
          sumAggregated('queue_terminal_count', tenantId, since, until),
          sumAggregated('email_failed_count', tenantId, since, until),
          sumAggregated('email_terminal_count', tenantId, since, until),
          sumAggregated('webhook_failure_count', tenantId, since, until),
        ]);

        const queueFailureRate = queueTerminal > 0 ? queueFailed / queueTerminal : 0;
        const emailFailureRate = emailTerminal > 0 ? emailFailed / emailTerminal : 0;

        reply.status(200);
        return {
          success: true,
          message: 'Observability overview retrieved successfully',
          data: {
            window_hours: windowHours,
            since: since.toISOString(),
            until: until.toISOString(),
            tenant_id: tenantId,
            total_events_last_24h: totalEvents,
            total_errors_last_24h: totalErrors,
            queue_failure_rate_last_24h: queueFailureRate,
            email_failure_rate_last_24h: emailFailureRate,
            webhook_failure_last_24h: webhookFailed,
          },
        };
      }

      const [
        totalEventsLast24h,
        totalErrorsLast24h,
        queueTerminalLast24h,
        queueFailedLast24h,
        emailTerminalLast24h,
        emailFailedLast24h,
        webhookFailedLast24h,
      ] = await Promise.all([
        prisma.systemEventLog.count({ where: { created_at: timeWhere, ...(tenantId ? { tenant_id: tenantId } : {}) } }),
        prisma.systemEventLog.count({
          where: {
            created_at: timeWhere,
            severity: { in: ['ERROR', 'CRITICAL'] },
            ...(tenantId ? { tenant_id: tenantId } : {}),
          },
        }),
        prisma.queueJobLog.count({
          where: {
            created_at: timeWhere,
            status: { in: ['COMPLETED', 'FAILED'] },
            ...(tenantId ? { tenant_id: tenantId } : {}),
          },
        }),
        prisma.queueJobLog.count({
          where: { created_at: timeWhere, status: 'FAILED', ...(tenantId ? { tenant_id: tenantId } : {}) },
        }),
        prisma.queueJobLog.count({
          where: {
            created_at: timeWhere,
            queue_name: EMAIL_QUEUE_NAME,
            status: { in: ['COMPLETED', 'FAILED'] },
            ...(tenantId ? { tenant_id: tenantId } : {}),
          },
        }),
        prisma.queueJobLog.count({
          where: {
            created_at: timeWhere,
            queue_name: EMAIL_QUEUE_NAME,
            status: 'FAILED',
            ...(tenantId ? { tenant_id: tenantId } : {}),
          },
        }),
        prisma.systemEventLog.count({
          where: {
            created_at: timeWhere,
            event_type: { in: ['PAYMENT_WEBHOOK_PROCESSED', 'payment.webhook.processed'] } as any,
            domain: 'PAYMENT',
            severity: { in: ['ERROR', 'CRITICAL'] },
            ...(tenantId ? { tenant_id: tenantId } : {}),
          },
        }),
      ]);

      const queueFailureRateLast24h = queueTerminalLast24h > 0 ? queueFailedLast24h / queueTerminalLast24h : 0;
      const emailFailureRateLast24h = emailTerminalLast24h > 0 ? emailFailedLast24h / emailTerminalLast24h : 0;

      reply.status(200);
      return {
        success: true,
        message: 'Observability overview retrieved successfully',
        data: {
          window_hours: windowHours,
          since: since.toISOString(),
          until: until.toISOString(),
          tenant_id: tenantId,
          total_events_last_24h: totalEventsLast24h,
          total_errors_last_24h: totalErrorsLast24h,
          queue_failure_rate_last_24h: queueFailureRateLast24h,
          email_failure_rate_last_24h: emailFailureRateLast24h,
          webhook_failure_last_24h: webhookFailedLast24h,
        },
      };
    },
  });
}
