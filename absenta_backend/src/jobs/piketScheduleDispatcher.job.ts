import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';
import { JadwalPiketService } from '@/modules/kurikulum/jadwal-piket/services/jadwal-piket.service';

export const PIKET_SCHEDULE_DISPATCHER_JOB_NAME = 'piket-schedule-dispatcher';

/**
 * 🚀 SaaS Dynamic Minute Dispatcher for Piket Reminders
 * Berjalan setiap 1 menit untuk mengevaluasi waktu lokal per-tenant (WIB / WITA / WIT),
 * mencocokkan jadwal pengingat pagi/malam sesuai jam custom sekolah, dan mengeksekusi dengan
 * perlindungan Idempotency Guard (anti-duplikasi).
 */
export default defineCronJob({
  name: PIKET_SCHEDULE_DISPATCHER_JOB_NAME,
  schedule: '*/1 * * * *', // Setiap 1 menit
  lockTtlSeconds: 55,      // Distributed lock 55 detik agar aman multi-cluster PM2
  async run() {
    const service = new JadwalPiketService();
    const result = await service.dispatchDueTenantReminders();

    if (result.sentCount > 0 || result.skippedCount > 0) {
      appLogger.info(
        {
          job: PIKET_SCHEDULE_DISPATCHER_JOB_NAME,
          processed: result.processedCount,
          sent: result.sentCount,
          skipped: result.skippedCount
        },
        `[PiketDispatcher] Selesai memproses evaluasi jadwal piket guru. Terkirim: ${result.sentCount}, Dilewati: ${result.skippedCount}`
      );
    }
  }
});
