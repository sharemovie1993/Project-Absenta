import bcrypt from 'bcrypt';
import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function updateTenantUserCommand(tenantId: string, userId: string, updateData: any) {
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

    // Hash password if provided
    if (updateData.password && updateData.password.length >= 8) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    if (updateData?.status) {
      const s = String(updateData.status).toUpperCase();
      if (s !== 'ACTIVE' && s !== 'INACTIVE') {
        throw new Error('Status pengguna tidak valid');
      }
      updateData.status = s;
    }

    // Extract updatedBy metadata before database update
    const { updatedBy, ...prismaData } = updateData;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: prismaData,
      select: {
        id: true,
        full_name: true,
        email: true,
        role_id: true,
        status: true,
        updated_at: true
      }
    });

    await prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        user_id: updatedBy,
        action: 'UPDATE_USER',
        entity: 'USER',
        entity_id: updatedUser.id,
        metadata: JSON.stringify({ userId: updatedUser.id })
      }
    });

    return updatedUser;
  } catch (error) {
    console.error('Error updating tenant user:', error);
    throw new Error('Gagal mengupdate user');
  }
}
