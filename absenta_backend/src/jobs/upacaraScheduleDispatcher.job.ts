import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';
import { pembinaUpacaraService } from '@/modules/attendance/pembina-upacara/services/pembina-upacara.service';

export const UPACARA_SCHEDULE_DISPATCHER_JOB_NAME = 'upacara-schedule-dispatcher';

/**
 * 🚀 SaaS Dynamic Minute Dispatcher for Pembina Upacara Reminders
 * Berjalan setiap 1 menit untuk mengevaluasi waktu lokal per-tenant (WIB / WITA / WIT):
 * 1. Hari Jum'at (Gladi/Latihan) -> Notifikasi personal WA ke Pembina Upacara & Wali Kelas
 * 2. Hari Senin Pagi (Hari H) -> Siaran pengumuman resmi upacara ke Group WA Dewan Guru
 */
export default defineCronJob({
  name: UPACARA_SCHEDULE_DISPATCHER_JOB_NAME,
  schedule: '*/1 * * * *', // Setiap 1 menit
  lockTtlSeconds: 55,      // Distributed lock 55 detik agar aman multi-cluster PM2
  async run() {
    const result = await pembinaUpacaraService.dispatchDueTenantReminders();

    if (result.sentCount > 0 || result.skippedCount > 0) {
      appLogger.info(
        {
          job: UPACARA_SCHEDULE_DISPATCHER_JOB_NAME,
          processed: result.processedCount,
          sent: result.sentCount,
          skipped: result.skippedCount,
        },
        `[UpacaraDispatcher] Selesai memproses evaluasi jadwal pembina upacara. Terkirim: ${result.sentCount}, Dilewati: ${result.skippedCount}`
      );
    }
  },
});
