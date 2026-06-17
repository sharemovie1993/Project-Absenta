import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

/**
 * Jalankan satu siklus auto-close sesi kehadiran.
 * Diekspor untuk backward compatibility dengan attendance.worker.ts
 */
export async function runAttendanceAutoCloseCycle(): Promise<void> {
  const { getAttendanceQueue } = await import('../queues/attendance.queue');
  const q = getAttendanceQueue();
  const windowKey = Math.floor(Date.now() / 60_000);
  await q.add('attendance-auto-close', { ts: Date.now() }, { jobId: `attendance-auto-close_${windowKey}` });
}

export default defineCronJob({
  name: 'attendanceAutoClose',
  schedule: '* * * * *', // setiap menit
  lockTtlSeconds: 55,
  async run() {
    const { getAttendanceQueue } = await import('../queues/attendance.queue');
    const q = getAttendanceQueue();
    const windowKey = Math.floor(Date.now() / 60_000);
    await q.add(
      'attendance-auto-close',
      { ts: Date.now() },
      { jobId: `attendance-auto-close_${windowKey}` }
    );
    appLogger.debug({ job: 'attendanceAutoClose' }, 'attendanceAutoClose: enqueued');
  },
});
