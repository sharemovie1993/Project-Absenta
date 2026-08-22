import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';
import { JadwalPiketService } from '@/modules/kurikulum/jadwal-piket/services/jadwal-piket.service';

export const PIKET_MORNING_REMINDER_JOB_NAME = 'piket-morning-reminder';

export default defineCronJob({
  name: PIKET_MORNING_REMINDER_JOB_NAME,
  schedule: '0 5 * * *', // Setiap hari pukul 05:00 WIB (Kirim Jadwal Piket Hari Ini)
  async run() {
    const service = new JadwalPiketService();
    const configRows = await prisma.config.findMany({
      where: { key: 'PIKET_WA_NOTIF_CONFIG' }
    });

    if (configRows.length === 0) {
      appLogger.info({ job: PIKET_MORNING_REMINDER_JOB_NAME }, 'Tidak ada tenant dengan konfigurasi notifikasi piket guru');
      return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    for (const row of configRows) {
      try {
        const config = JSON.parse(row.value);
        if (config.enabled && config.morningEnabled && config.targetGroupId) {
          const result = await service.sendPiketReminderToGroup(row.tenant_id, false);
          if (result.skipped) {
            skippedCount++;
          } else {
            sentCount++;
          }
        }
      } catch (err: any) {
        appLogger.error({ job: PIKET_MORNING_REMINDER_JOB_NAME, tenantId: row.tenant_id, err: err.message }, 'Gagal mengirim pengingat pagi piket guru');
      }
    }

    appLogger.info({ job: PIKET_MORNING_REMINDER_JOB_NAME, sentCount, skippedCount }, `Selesai memproses pengingat pagi piket guru ke WA Group. Terkirim: ${sentCount}, Dilewati (Libur): ${skippedCount}`);
  }
});
