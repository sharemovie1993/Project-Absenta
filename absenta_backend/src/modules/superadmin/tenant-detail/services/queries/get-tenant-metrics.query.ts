import { cacheService } from '../../../../../utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../../constants/cache-keys';
import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function getTenantMetricsQuery(tenantId: string) {
  const cacheKey = CACHE_KEYS.TENANT.METRICS(tenantId);

  try {
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const [totalUsers, totalSiswa, totalGuru, totalKelas, totalJurusan, totalMapel, activeSubscription, recentActivities] =
          await Promise.all([
            prisma.user.count({ where: { tenant_id: tenantId } }),
            prisma.siswa.count({ where: { tenant_id: tenantId } }),
            prisma.guru.count({ where: { tenant_id: tenantId } }),
            prisma.kelas.count({ where: { tenant_id: tenantId } }),
            prisma.jurusan.count({ where: { tenant_id: tenantId } }),
            prisma.mapel.count({ where: { tenant_id: tenantId } }),
            prisma.subscription.findFirst({
              where: {
                tenant_id: tenantId,
                status: 'ACTIVE'
              },
              include: { Plan: true }
            }),
            prisma.activityLog.count({
              where: {
                tenant_id: tenantId,
                created_at: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            })
          ]);

        return {
          users: {
            total: totalUsers,
            siswa: totalSiswa,
            guru: totalGuru
          },
          academic: {
            kelas: totalKelas,
            jurusan: totalJurusan,
            mapel: totalMapel
          },
          subscription: activeSubscription,
          activities: {
            last24Hours: recentActivities
          }
        };
      },
      CACHE_TTL.METRICS
    );
  } catch (error) {
    console.error('Error getting tenant metrics:', error);
    throw new Error(`Gagal mengambil metrics tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
