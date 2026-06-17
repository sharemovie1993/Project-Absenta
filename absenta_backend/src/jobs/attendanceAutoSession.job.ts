import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

/**
 * Helper: dapatkan waktu lokal tenant berdasarkan timezone config.
 * Diekspor untuk dipakai sesi-absensi.controller.ts
 */
export function getTenantLocalTime(timezone: string | null | undefined, now: Date): { dateStr: string; timeZone: string } {
  const tz = timezone || 'Asia/Jakarta';
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateStr = formatter.format(now);
  return { dateStr, timeZone: tz };
}

/**
 * Trigger pembuatan sesi untuk satu tenant.
 * Diekspor untuk dipakai sesi-absensi.controller.ts dan adhoc scripts.
 */
export async function generateSessionsForTenant(
  tenantId: string,
  dateStr: string,
  timeZone: string
): Promise<{ success: boolean; message: string; [key: string]: any }> {
  const { getAttendanceQueue } = await import('../queues/attendance.queue');
  const q = getAttendanceQueue();
  await q.add('attendance-auto-session-tenant', { tenantId, dateStr, timeZone, ts: Date.now() }, {
    jobId: `attendance-auto-session-${tenantId}-${dateStr}`,
  });
  return { success: true, message: `Sesi untuk tenant ${tenantId} berhasil di-enqueue` };
}

/**
 * Jalankan satu siklus pembuatan sesi otomatis (untuk semua tenant).
 * Diekspor untuk dipakai attendance.worker.ts dan adhoc scripts.
 */
export async function runAttendanceAutoSessionCycle(): Promise<void> {
  const { getAttendanceQueue } = await import('../queues/attendance.queue');
  const q = getAttendanceQueue();
  const windowKey = Math.floor(Date.now() / 60_000);
  await q.add('attendance-auto-session', { ts: Date.now() }, { jobId: `attendance-auto-session_${windowKey}` });
}

export default defineCronJob({
  name: 'attendanceAutoSession',
  schedule: '* * * * *', // setiap menit
  lockTtlSeconds: 55,
  async run() {
    const { getAttendanceQueue } = await import('../queues/attendance.queue');
    const q = getAttendanceQueue();
    const windowKey = Math.floor(Date.now() / 60_000);
    await q.add(
      'attendance-auto-session',
      { ts: Date.now() },
      { jobId: `attendance-auto-session_${windowKey}` }
    );
    appLogger.debug({ job: 'attendanceAutoSession' }, 'attendanceAutoSession: enqueued');
  },
});
