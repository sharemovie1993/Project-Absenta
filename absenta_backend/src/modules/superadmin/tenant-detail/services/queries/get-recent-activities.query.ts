import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function getRecentActivitiesQuery(tenantId: string, limit: number = 10) {
  try {
    const activities = await prisma.activityLog.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        User: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        }
      }
    });

    return {
      success: true,
      message: 'Aktivitas terbaru berhasil diambil',
      data: activities
    };
  } catch (error) {
    console.error('Error getting recent activities:', error);
    throw new Error(`Gagal mengambil aktivitas terbaru: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
