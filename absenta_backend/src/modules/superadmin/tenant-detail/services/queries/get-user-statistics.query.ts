import { cacheService } from '../../../../../utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../../constants/cache-keys';
import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function getUserStatisticsQuery(tenantId: string) {
  const cacheKey = CACHE_KEYS.TENANT.USERS(tenantId);

  try {
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const userStats = await prisma.user.groupBy({
          by: ['role_id'],
          where: { tenant_id: tenantId },
          _count: { id: true },
          orderBy: { role_id: 'asc' }
        });

        const rolesWithStats = await Promise.all(
          (userStats as any[]).map(async (stat: any) => {
            const role = await prisma.role.findUnique({
              where: { id: stat.role_id }
            });
            return {
              roleName: role?.name || 'Unknown',
              count: stat._count?.id || 0
            };
          })
        );

        const activeUsers = await prisma.user.count({
          where: {
            tenant_id: tenantId,
            status: 'ACTIVE'
          }
        });

        const totalUsers = await prisma.user.count({
          where: { tenant_id: tenantId }
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newUsersThisMonth = await prisma.user.count({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: startOfMonth
            }
          }
        });

        return {
          totalUsers,
          activeUsers,
          newUsersThisMonth,
          usersByRole: rolesWithStats,
          activeUserPercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        };
      },
      CACHE_TTL.USER_STATS
    );
  } catch (error) {
    console.error('Error getting user statistics:', error);
    throw new Error('Gagal mengambil statistik pengguna');
  }
}
