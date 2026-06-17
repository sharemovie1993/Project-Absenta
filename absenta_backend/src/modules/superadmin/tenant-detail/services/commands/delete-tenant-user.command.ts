import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function deleteTenantUserCommand(tenantId: string, userId: string, deletedBy: string) {
  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenant_id: tenantId
      }
    });

    if (!existingUser) {
      throw new Error('User tidak ditemukan atau tidak memiliki akses');
    }

    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'INACTIVE',
        updated_at: new Date()
      },
      select: {
        id: true,
        full_name: true,
        email: true
      }
    });

    await prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        user_id: deletedBy,
        action: 'DELETE_USER',
        entity: 'USER',
        entity_id: deletedUser.id,
        metadata: JSON.stringify({ userId: deletedUser.id })
      }
    });

    return deletedUser;
  } catch (error) {
    console.error('Error deleting tenant user:', error);
    throw new Error('Gagal menghapus user');
  }
}
