import { prisma } from '@/utils/prisma';

export async function logAdminResetUserPasswordCommand(params: {
  tenantId: string;
  userId: string;
  targetUserId: string;
  adminRole: string;
  ip?: string;
}) {
  await prisma.activityLog.create({
    data: {
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: 'ADMIN_RESET_USER_PASSWORD',
      entity: 'USER',
      entity_id: params.targetUserId,
      metadata: JSON.stringify({
        target_user_id: params.targetUserId,
        admin_role: params.adminRole,
        ip: params.ip,
      }),
    },
  });
}

export async function logAdminUpdateRolePermissionsCommand(params: {
  tenantId: string;
  userId: string;
  roleId: string;
  roleName: string;
  previousPermissions: any[];
  newPermissions: any[];
  actorRole: string;
  actorTenantId?: string | null;
  ip?: string;
}) {
  await prisma.activityLog.create({
    data: {
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: 'ADMIN_UPDATE_ROLE_PERMISSIONS',
      entity: 'ROLE',
      entity_id: params.roleId,
      metadata: JSON.stringify({
        role_id: params.roleId,
        role_name: params.roleName,
        previous_permissions: params.previousPermissions ?? [],
        new_permissions: params.newPermissions ?? [],
        actor_role: params.actorRole,
        actor_tenant_id: params.actorTenantId,
        ip: params.ip,
      }),
    },
  });
}

