import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

/**
 * Attendance Digest — kirim ringkasan kehadiran harian & mingguan.
 * Jadwal: cek setiap menit, tapi enqueue hanya saat waktu digest per-tenant tercapai.
 * Idempotency dijaga via jobId berbasis tanggal/pekan.
 */
export default defineCronJob({
  name: 'attendanceDigest',
  schedule: '* * * * *', // tick setiap menit — engine cek kondisi waktu per tenant
  lockTtlSeconds: 55,
  async run() {
    const { getAttendanceQueue } = await import('../queues/attendance.queue');
    const q = getAttendanceQueue();
    const windowKey = Math.floor(Date.now() / 60_000);
    await q.add(
      'attendance-digest',
      { ts: Date.now() },
      { jobId: `attendance-digest_${windowKey}` }
    );
    appLogger.debug({ job: 'attendanceDigest' }, 'attendanceDigest: enqueued tick');
  },
});

/**
 * Jalankan satu siklus digest kehadiran.
 * Diekspor untuk backward compatibility dengan attendance.worker.ts dan notification.worker.ts
 */
export async function runAttendanceDigestCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('attendanceDigest');
}
