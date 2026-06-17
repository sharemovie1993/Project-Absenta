import { closeRedisConnection } from '../../src/queue/redis';

async function main() {
  const count = parseInt(process.env.DIAG_COUNT || process.argv[2] || '20', 10);
  const burnMs = parseInt(process.env.DIAG_MS || process.argv[3] || '4000', 10);

  const jobs: Array<Promise<any>> = [];
  try {
    const { getMaintenanceQueue } = await import('../../src/queues/maintenance.queue');
    const q = getMaintenanceQueue();
    const ts = Date.now();
    for (let i = 0; i < count; i++) {
      jobs.push(q.add('diag-cpu-burn', { ms: burnMs }, { jobId: `diag_cpu_${ts}_${i}` }));
    }
    console.log(`[diagnostic-load] Enqueued ${count} diag-cpu-burn jobs (ms=${burnMs}) on maintenance queue`);
  } catch (e) {
    console.error('[diagnostic-load] maintenance queue unavailable:', (e as Error).message);
  }

  await Promise.allSettled(jobs);
  await closeRedisConnection();
}

void main().catch(async (err) => {
  try {
    console.error('[diagnostic-load] Error:', err);
  } catch {}
  try {
    await closeRedisConnection();
  } catch {}
  process.exit(1);
});
