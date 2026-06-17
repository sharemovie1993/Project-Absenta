import { closeRedisConnection } from '../../src/queue/redis';

async function main() {
  const count = parseInt(process.env.LOAD_COUNT || process.argv[2] || '50', 10);
  const spacingMs = parseInt(process.env.LOAD_SPACING_MS || process.argv[3] || '50', 10);

  const jobs = [] as Array<Promise<any>>;
  const startedAt = Date.now();

  // Attendance: safe no-op style infra job used by scheduler
  try {
    const { getAttendanceQueue } = await import('../../src/queues/attendance.queue');
    const q = getAttendanceQueue();
    for (let i = 0; i < count; i++) {
      jobs.push(
        q.add('attendance-auto-close', { ts: Date.now(), seq: i }, { jobId: `dev-load_att-close_${startedAt}_${i}` }),
      );
      if (spacingMs > 0) await new Promise((r) => setTimeout(r, spacingMs));
    }
    console.log(`[load-workers] Enqueued ${count} jobs to attendance queue`);
  } catch (e) {
    console.warn('[load-workers] attendance queue unavailable:', (e as Error).message);
  }

  // Maintenance: lightweight housekeeping (safe for dev)
  try {
    const { getMaintenanceQueue } = await import('../../src/queues/maintenance.queue');
    const qm = getMaintenanceQueue();
    for (let i = 0; i < Math.max(1, Math.floor(count / 5)); i++) {
      jobs.push(qm.add('log-retention', { ts: Date.now(), seq: i }, { jobId: `dev-load_log-ret_${startedAt}_${i}` }));
      jobs.push(
        qm.add('failed-job-cleanup', { ts: Date.now(), seq: i }, { jobId: `dev-load_fail-clean_${startedAt}_${i}` }),
      );
      if (spacingMs > 0) await new Promise((r) => setTimeout(r, spacingMs));
    }
    console.log(
      `[load-workers] Enqueued ${Math.max(1, Math.floor(count / 5)) * 2} jobs to maintenance queue (log-retention, failed-job-cleanup)`,
    );
  } catch (e) {
    console.warn('[load-workers] maintenance queue unavailable:', (e as Error).message);
  }

  // Recurring: choose a lightweight operation (trial end) with synthetic ID; okay if fails, tetap memicu CPU
  try {
    const { getRecurringQueue } = await import('../../src/queues/recurring.queue');
    const qr = getRecurringQueue();
    for (let i = 0; i < Math.max(1, Math.floor(count / 4)); i++) {
      jobs.push(
        qr.add(
          'PROCESS_TRIAL_END' as any,
          { invoiceId: `dev-load-fake-invoice-${startedAt}-${i}`, correlationId: `dev-load-${startedAt}` } as any,
          { jobId: `dev-load_trial-end_${startedAt}_${i}` },
        ),
      );
      if (spacingMs > 0) await new Promise((r) => setTimeout(r, spacingMs));
    }
    console.log(`[load-workers] Enqueued ${Math.max(1, Math.floor(count / 4))} jobs to recurring queue (PROCESS_TRIAL_END)`);
  } catch (e) {
    console.warn('[load-workers] recurring queue unavailable:', (e as Error).message);
  }

  // Wait all enqueue ops completed
  await Promise.allSettled(jobs);
  console.log('[load-workers] Done enqueueing. Monitor CPU/Memory on Infra Control > Workers.');

  // Close Redis to exit cleanly
  await closeRedisConnection();
}

void main().catch(async (e) => {
  console.error('[load-workers] Error:', e);
  try {
    await closeRedisConnection();
  } catch {}
  process.exit(1);
});
