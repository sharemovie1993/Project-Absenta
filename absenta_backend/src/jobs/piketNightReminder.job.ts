import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';
import { JadwalPiketService } from '@/modules/kurikulum/jadwal-piket/services/jadwal-piket.service';

export const PIKET_NIGHT_REMINDER_JOB_NAME = 'piket-night-reminder';

export default defineCronJob({
  name: PIKET_NIGHT_REMINDER_JOB_NAME,
  schedule: '0 23 * * *', // Setiap hari pukul 23:00 WIB (Kirim Jadwal Piket Besok Hari)
  async run() {
    const service = new JadwalPiketService();
    const configRows = await prisma.config.findMany({
      where: { key: 'PIKET_WA_NOTIF_CONFIG' }
    });

    if (configRows.length === 0) {
      appLogger.info({ job: PIKET_NIGHT_REMINDER_JOB_NAME }, 'Tidak ada tenant dengan konfigurasi notifikasi piket guru');
      return;
    }

    let processedCount = 0;
    for (const row of configRows) {
      try {
        const config = JSON.parse(row.value);
        if (config.enabled && config.nightEnabled && config.targetGroupId) {
          await service.sendPiketReminderToGroup(row.tenant_id, true);
          processedCount++;
        }
      } catch (err: any) {
        appLogger.error({ job: PIKET_NIGHT_REMINDER_JOB_NAME, tenantId: row.tenant_id, err: err.message }, 'Gagal mengirim pengingat malam piket guru');
      }
    }

    appLogger.info({ job: PIKET_NIGHT_REMINDER_JOB_NAME, processedCount }, `Selesai mengirim pengingat malam piket guru ke WA Group. Terkirim: ${processedCount}`);
  }
});
