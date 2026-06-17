import * as bcrypt from 'bcryptjs';
import { tenantDetailDb as prisma } from '../repositories/tenant-detail.db';

export async function createTenantUserCommand(tenantId: string, userData: any) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error('Tenant tidak ditemukan');
    }

    const role = await prisma.role.findFirst({
      where: {
        name: userData.role
      }
    });

    if (!role) {
      throw new Error(`Role '${userData.role}' tidak ditemukan`);
    }

    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : await bcrypt.hash('defaultPassword123!', 10);

    const newUser = await prisma.user.create({
      data: {
        tenant_id: tenantId,
        email: userData.email,
        password: hashedPassword,
        full_name: userData.name || userData.full_name,
        role_id: role.id,
        status: 'ACTIVE',
        email_verified: false
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role_id: true,
        status: true,
        created_at: true,
        Role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        user_id: userData.createdBy,
        action: 'CREATE_USER',
        entity: 'USER',
        entity_id: newUser.id,
        metadata: JSON.stringify({
          userId: newUser.id,
          userEmail: newUser.email,
          roleName: role.name
        })
      }
    });

    return newUser;
  } catch (error) {
    console.error('Error creating tenant user:', error);
    throw new Error(error instanceof Error ? error.message : 'Gagal membuat user baru');
  }
}
