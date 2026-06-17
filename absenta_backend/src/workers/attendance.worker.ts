import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../queue/redis';
import { ATTENDANCE_QUEUE_NAME } from '../queues/attendance.queue';
import { startWorkerRegistryAndHeartbeat, startWorkerHeartbeat } from '../infra/workerHeartbeat';
import { getAttendanceDlqQueue } from '../queues/attendance.queue';
import { registerQueue, markJobStart, markJobEnd } from '../infra/jobRegistry';
import { resolveWorkerConcurrency } from '../infra/auto-tune';

async function processJob(job: Job): Promise<any> {
  await markJobStart(ATTENDANCE_QUEUE_NAME);
  const startTime = Date.now();
  const name = String(job.name);
  const tenantId = String((job.data as any)?.tenant_id || (job.data as any)?.tenantId || '');
  const correlationId = String((job.data as any)?.correlation_id || (job.data as any)?.correlationId || '');
  const startedAt = Date.now();
  console.log(`[attendance-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=attendance-worker job_id=${String(job.id || '')} retry_count=${job.attemptsMade || 0}`);

  try {
    let result = null;
    if (name === 'attendance-auto-session') {
      const { runAttendanceAutoSessionCycle } = await import('../jobs/attendanceAutoSession.job');
      await runAttendanceAutoSessionCycle();
    } else if (name === 'attendance-auto-close') {
      const { runAttendanceAutoCloseCycle } = await import('../jobs/attendanceAutoClose.job');
      await runAttendanceAutoCloseCycle();
    } else if (name === 'attendance-digest') {
      const { runAttendanceDigestCycle } = await import('../jobs/attendanceDigest.job');
      await runAttendanceDigestCycle();
    } else if (name === 'attendance-manual-absence') {
      const { gerbangService } = await import('../modules/attendance/gerbang/services/gerbang.service');
      const status = String((job.data as any)?.status || '');
      const siswaId = String((job.data as any)?.siswa_id || (job.data as any)?.siswaId || '');
      const parentId = String((job.data as any)?.parent_id || (job.data as any)?.parentId || '');
      const keterangan = (job.data as any)?.keterangan;
      result = await gerbangService.markManualAbsence(
        tenantId,
        siswaId,
        status,
        parentId,
        'PARENT_APP',
        keterangan
      );
    } else if (name === 'attendance-stress-session') {
      const msRaw = Number((job.data as any)?.ms ?? 25);
      const ms = Math.max(0, Math.min(60000, Number.isFinite(msRaw) ? msRaw : 25));
      if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    }
    const durationMs = Date.now() - startedAt;
    console.log(`[attendance-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=attendance-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')}`);
    await markJobEnd(ATTENDANCE_QUEUE_NAME, Date.now() - startTime);
    return result;
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    console.error(`[attendance-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=attendance-worker job_id=${String(job.id || '')} error=${String(err?.message || err || '')}`);
    console.error(`[attendance-worker] event_type=${name} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=attendance-worker processing_time_ms=${durationMs} retry_count=${job.attemptsMade || 0} job_id=${String(job.id || '')} status=FAILED`);
    await markJobEnd(ATTENDANCE_QUEUE_NAME, Date.now() - startTime);
    throw err;
  }
}

export async function startAttendanceWorker() {
  const conn = getRedisConnection();
  const concurrency = resolveWorkerConcurrency(3);
  startWorkerHeartbeat(conn as any, 'absenta-attendance-worker', 5000);
  startWorkerRegistryAndHeartbeat(conn as any, 'attendance', 5000, { concurrency, version: process.env.APP_VERSION });

  void registerQueue(ATTENDANCE_QUEUE_NAME, concurrency);

  const w = new Worker(ATTENDANCE_QUEUE_NAME, processJob, {
    connection: conn,
    concurrency,
  });
  w.on('failed', async (job: any, err: any) => {
    try {
      const maxAttempts = typeof job?.opts?.attempts === 'number' ? job.opts.attempts : 1;
      const attemptsMade = typeof job?.attemptsMade === 'number' ? job.attemptsMade : 0;
      if (attemptsMade < maxAttempts) return;
      const dlq = getAttendanceDlqQueue();
      await dlq.add(
        `dlq:${String(job?.name || 'unknown')}`,
        {
          queue_name: ATTENDANCE_QUEUE_NAME,
          worker_name: 'attendance-worker',
          event_type: String(job?.name || ''),
          job_id: String(job?.id || ''),
          retry_count: attemptsMade,
          tenant_id: (job?.data as any)?.tenant_id || (job?.data as any)?.tenantId || null,
          correlation_id: (job?.data as any)?.correlation_id || (job?.data as any)?.correlationId || null,
          payload: job?.data || null,
          error_message: String(err?.message || err || ''),
          failed_at: new Date().toISOString(),
        },
        { jobId: `attendance_dlq_${String(job?.id || '')}` },
      );
    } catch {}
  });

  const portRaw = process.env.WORKER_PORT ? parseInt(String(process.env.WORKER_PORT), 10) : NaN;
  if (Number.isFinite(portRaw)) {
    const http = require('http');
    const server = http.createServer((_req: any, res: any) => {
      const payload = { worker: 'attendance-worker', status: 'UP', queues: 1 };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    });
    server.listen(portRaw, '0.0.0.0');
  }
}

