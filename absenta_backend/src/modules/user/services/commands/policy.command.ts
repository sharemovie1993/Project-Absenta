import { prisma } from '@/utils/prisma';

export async function exportPoliciesCommand(generatedBy: string | null) {
  const rolePermissions = await prisma.rolePermission.findMany({
    include: {
      Role: { select: { name: true, tenant_id: true } },
      Permission: { select: { id: true } },
    },
  });

  const rolesMap = new Map<string, any>();
  rolePermissions.forEach((rp: any) => {
    const key = `${rp.Role.name}::${rp.Role.tenant_id || 'system'}`;
    if (!rolesMap.has(key)) {
      rolesMap.set(key, {
        role_name: rp.Role.name,
        tenant_id: rp.Role.tenant_id,
        permissions: [],
      });
    }
    rolesMap.get(key).permissions.push(rp.Permission.id);
  });

  const strukturPermissions = await prisma.organizationalCapability.findMany({
    include: {
      Position: { select: { id: true, code: true, name: true, tenant_id: true } },
      Permission: { select: { id: true } },
    },
  });

  const structuresMap = new Map<string, any>();
  strukturPermissions.forEach((sp: any) => {
    const key = sp.Position.id;
    if (!structuresMap.has(key)) {
      structuresMap.set(key, {
        structure_id: sp.Position.id,
        structure_code: sp.Position.code,
        structure_name: sp.Position.name,
        tenant_id: sp.Position.tenant_id,
        permissions: [],
      });
    }
    structuresMap.get(key).permissions.push(sp.Permission.id);
  });

  return {
    meta: {
      generated_at: new Date().toISOString(),
      version: '1.0',
      generated_by: generatedBy || 'system',
    },
    roles: Array.from(rolesMap.values()),
    structures: Array.from(structuresMap.values()),
  };
}

export async function importPoliciesCommand(input: { roles?: any[]; structures?: any[] }) {
  const { roles, structures } = input;

  const results = {
    roles_updated: 0,
    structures_updated: 0,
    errors: [] as string[],
  };

  await prisma.$transaction(async (tx) => {
    if (roles && Array.isArray(roles)) {
      for (const roleData of roles) {
        const role = await tx.role.findFirst({
          where: {
            name: roleData.role_name,
            tenant_id: roleData.tenant_id || null,
          },
        });

        if (role) {
          await tx.rolePermission.deleteMany({ where: { role_id: role.id } });
          if (roleData.permissions && roleData.permissions.length > 0) {
            const validPermissions = await tx.permission.findMany({
              where: { id: { in: roleData.permissions } },
              select: { id: true },
            });
            await tx.rolePermission.createMany({
              data: validPermissions.map((p) => ({
                role_id: role.id,
                permission_id: p.id,
              })),
            });
          }
          results.roles_updated++;
        } else {
          results.errors.push(`Role not found: ${roleData.role_name} (Tenant: ${roleData.tenant_id})`);
        }
      }
    }

    if (structures && Array.isArray(structures)) {
      for (const structData of structures) {
        let structure = null as any;

        if (structData.structure_id) {
          structure = await tx.organizationalPosition.findUnique({ where: { id: structData.structure_id } });
        }

        if (!structure && structData.structure_code && structData.tenant_id) {
          structure = await tx.organizationalPosition.findFirst({
            where: {
              code: structData.structure_code,
              tenant_id: structData.tenant_id,
            },
          });
        }

        if (structure) {
          await tx.organizationalCapability.deleteMany({ where: { position_id: structure.id } });
          if (structData.permissions && structData.permissions.length > 0) {
            const validPermissions = await tx.permission.findMany({
              where: { id: { in: structData.permissions } },
              select: { id: true },
            });
            await tx.organizationalCapability.createMany({
              data: validPermissions.map((p) => ({
                position_id: structure.id,
                permission_id: p.id,
              })),
            });
          }
          results.structures_updated++;
        } else {
          results.errors.push(`Structure not found: ${structData.structure_name || structData.structure_id}`);
        }
      }
    }
  });

  return results;
}

export async function resetPoliciesCommand(
  type: string | undefined,
  actor: { tenantId: string; userId: string; roleName: string; ip?: string }
) {
  const results = {
    roles_deleted: 0,
    structures_deleted: 0,
  };

  await prisma.$transaction(async (tx) => {
    if (!type || type === 'all' || type === 'roles') {
      const deletedRoles = await tx.rolePermission.deleteMany({});
      results.roles_deleted = deletedRoles.count;
    }

    if (!type || type === 'all' || type === 'structures') {
      const deletedStructures = await tx.organizationalCapability.deleteMany({});
      results.structures_deleted = deletedStructures.count;
    }
  });

  await prisma.activityLog.create({
    data: {
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      action: 'ADMIN_RESET_POLICIES',
      entity: 'POLICY',
      entity_id: 'GLOBAL',
      metadata: JSON.stringify({
        type: type || 'all',
        results,
        actor_role: actor.roleName,
        ip: actor.ip,
      }),
    },
  });

  return results;
}
