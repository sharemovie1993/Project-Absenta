/**
 * dailyExecutiveBriefing.job.ts
 * Cron Job otomatis pengiriman Daily Executive Briefing ke Kepala Sekolah setiap pukul 19:00 WIB.
 *
 * Logika:
 * 1. Berjalan setiap hari pada jam 19:00 WIB (0 19 * * *).
 * 2. Memindai seluruh tenant aktif yang memiliki WhatsApp Gateway terhubung.
 * 3. Menghasilkan ringkasan eksekutif makro lintas divisi (Kesiswaan, KBM, PKL, dll).
 * 4. Menghasilkan token publik aman (TTL 48 jam) dan mengirimkannya via WhatsApp ke Kepala Sekolah.
 */

import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';
import { prisma } from '../utils/prisma';
import { dailyBriefingService } from '../modules/daily-briefing/services/daily-briefing.service';
import { WhatsappService } from '../modules/whatsapp/services/whatsapp.service';

const whatsappService = new WhatsappService();

export default defineCronJob({
  name: 'dailyExecutiveBriefing',
  schedule: '0 19 * * *', // Setiap hari pukul 19:00
  lockTtlSeconds: 300,    // Lock 5 menit untuk batch processing
  async run() {
    appLogger.info({ job: 'dailyExecutiveBriefing' }, 'Memulai siklus Daily Executive Briefing (19:00 WIB)...');

    try {
      const activeTenants = await prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      appLogger.info(
        { job: 'dailyExecutiveBriefing', count: activeTenants.length },
        `Memproses ${activeTenants.length} tenant aktif...`
      );

      let successCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const tenant of activeTenants) {
        try {
          // 1. Cek apakah WA Gateway aktif untuk tenant ini
          const waConfig = await whatsappService.getConfig(tenant.id);
          if (!waConfig || !waConfig.is_active) {
            skippedCount++;
            continue;
          }

          // 2. Kirim laporan harian ke Kepala Sekolah
          const result = await dailyBriefingService.sendBriefingViaWhatsapp(
            tenant.id,
            'KEPALA_SEKOLAH'
          );

          if (result.success) {
            successCount++;
            appLogger.info(
              { job: 'dailyExecutiveBriefing', tenantId: tenant.id, recipient: result.recipient },
              `[Briefing] Berhasil dikirim ke Kepsek ${tenant.name} (${result.recipient})`
            );
          } else {
            failedCount++;
            appLogger.warn(
              { job: 'dailyExecutiveBriefing', tenantId: tenant.id, reason: result.message },
              `[Briefing] Dilewati / Gagal untuk ${tenant.name}: ${result.message}`
            );
          }
        } catch (err: any) {
          failedCount++;
          appLogger.error(
            { job: 'dailyExecutiveBriefing', tenantId: tenant.id, err: err.message },
            `[Briefing] Error saat memproses tenant ${tenant.name}`
          );
        }
      }

      appLogger.info(
        { job: 'dailyExecutiveBriefing', successCount, skippedCount, failedCount },
        `Siklus Daily Executive Briefing selesai: ${successCount} terkirim, ${skippedCount} dilewati, ${failedCount} gagal.`
      );
    } catch (error: any) {
      appLogger.error({ job: 'dailyExecutiveBriefing', err: error.message }, 'Gagal menjalankan dailyExecutiveBriefing job');
    }
  },
});

/**
 * Pemicu manual siklus briefing (dapat dipanggil dari controller atau testing)
 */
export async function runDailyExecutiveBriefingCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('dailyExecutiveBriefing');
}
