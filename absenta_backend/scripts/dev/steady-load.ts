import { closeRedisConnection } from '../../src/queue/redis';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const rps = Math.max(1, parseInt(process.argv[2] || '5', 10));
  const durationMs = Math.max(1000, parseInt(process.argv[3] || '60000', 10));
  const queuesArg = String(process.argv[4] || 'attendance,maintenance,recurring')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const qfns: Array<() => Promise<void>> = [];
  if (queuesArg.includes('attendance')) {
    const { getAttendanceQueue } = await import('../../src/queues/attendance.queue');
    const qa = getAttendanceQueue();
    qfns.push(async () => {
      const ts = Date.now();
      await qa.add('attendance-auto-close', { ts }, { jobId: `steady_att_${ts}_${Math.random().toString(36).slice(2)}` });
    });
  }
  if (queuesArg.includes('maintenance')) {
    const { getMaintenanceQueue } = await import('../../src/queues/maintenance.queue');
    const qm = getMaintenanceQueue();
    let flip = false;
    qfns.push(async () => {
      const ts = Date.now();
      const name = flip ? 'log-retention' : 'failed-job-cleanup';
      flip = !flip;
      await qm.add(name, { ts }, { jobId: `steady_maint_${name}_${ts}_${Math.random().toString(36).slice(2)}` });
    });
  }
  if (queuesArg.includes('recurring')) {
    const { getRecurringQueue } = await import('../../src/queues/recurring.queue');
    const qr = getRecurringQueue();
    qfns.push(async () => {
      const ts = Date.now();
      await qr.add(
        'PROCESS_TRIAL_END' as any,
        { invoiceId: `steady-invoice-${ts}`, correlationId: `steady-${ts}` } as any,
        { jobId: `steady_rec_trial_${ts}_${Math.random().toString(36).slice(2)}` },
      );
    });
  }

  if (qfns.length === 0) {
    console.error('no queues selected');
    process.exit(1);
  }

  const perJobDelay = Math.max(1, Math.floor(1000 / rps));
  const endAt = Date.now() + durationMs;
  let idx = 0;

  while (Date.now() < endAt) {
    try {
      await qfns[idx % qfns.length]();
    } catch {}
    idx++;
    await sleep(perJobDelay);
  }

  await closeRedisConnection();
}

void main().catch(async (err) => {
  try {
    // eslint-disable-next-line no-console
    console.error('[steady-load] Error:', err);
  } catch {}
  try {
    await closeRedisConnection();
  } catch {}
  process.exit(1);
});
