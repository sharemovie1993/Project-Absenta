import { cacheService } from '../../../../../utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../../constants/cache-keys';
import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function getTenantDetailQuery(tenantId: string) {
  const cacheKey = CACHE_KEYS.TENANT.DETAIL(tenantId);

  try {
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: {
            users: {
              include: {
                Role: true
              }
            },
            subscriptions: {
              include: {
                Plan: true
              }
            },
            sekolah: true,
            jurusan: true,
            kelas: true,
            guru: true,
            siswa: true,
            mapel: true,
            TahunPelajaran: true,
            Semester: true,
            sesiAbsensi: {
              take: 10,
              orderBy: { created_at: 'desc' }
            },

            activityLogs: {
              take: 10,
              orderBy: { created_at: 'desc' }
            },
            config: true
          }
        });

        if (!tenant) {
          throw new Error(`Tenant dengan ID ${tenantId} tidak ditemukan`);
        }

        return tenant;
      },
      CACHE_TTL.TENANT_DETAIL
    );
  } catch (error) {
    console.error('Error getting tenant detail:', error);
    throw new Error(`Gagal mengambil detail tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
