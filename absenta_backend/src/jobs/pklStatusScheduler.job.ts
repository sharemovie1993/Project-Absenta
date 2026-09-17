import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { defineCronJob } from '@/infra/jobEngine';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export const PKL_STATUS_SCHEDULER_JOB_NAME = 'pkl-status-scheduler';

export default defineCronJob({
  name: PKL_STATUS_SCHEDULER_JOB_NAME,
  schedule: '0 1 * * *', // Setiap hari pukul 01:00 dini hari
  async run() {
    const now = new Date();
    // Masa tenggang (Grace Period): 14 hari setelah estimasi tanggal_selesai
    const gracePeriodThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    appLogger.info({ job: PKL_STATUS_SCHEDULER_JOB_NAME }, 'Memulai evaluasi masa tenggang status penempatan PKL...');

    // Cari siswa PKL yang masih AKTIF, tanggal selesai sudah lewat grace period (+14 hari),
    // DAN sudah memiliki nilai akhir lengkap
    const expiredPlacements = await prisma.siswaPkl.findMany({
      where: {
        status: 'AKTIF',
        tanggal_selesai: {
          not: null,
          lt: gracePeriodThreshold
        },
        nilai_akhir_pkl: {
          not: null
        }
      },
      select: {
        id: true,
        tenant_id: true,
        siswa_id: true,
        tanggal_selesai: true
      }
    });

    if (expiredPlacements.length === 0) {
      appLogger.info({ job: PKL_STATUS_SCHEDULER_JOB_NAME }, 'Tidak ada penempatan PKL yang memenuhi kriteria auto-close.');
      return;
    }

    const idsToClose = expiredPlacements.map(p => p.id);
    const affectedTenants = Array.from(new Set(expiredPlacements.map(p => p.tenant_id)));

    const updateResult = await prisma.siswaPkl.updateMany({
      where: {
        id: { in: idsToClose }
      },
      data: {
        status: 'SELESAI'
      }
    });

    for (const tId of affectedTenants) {
      await cacheInvalidationService.invalidateHubinCache(tId);
    }

    appLogger.info(
      { job: PKL_STATUS_SCHEDULER_JOB_NAME, count: updateResult.count },
      `Berhasil memperbarui ${updateResult.count} penempatan PKL menjadi SELESAI secara otomatis.`
    );
  }
});
