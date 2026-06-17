import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const rolesToFix = ['GURU'];
  const permsToInject = [
    'notify.view.preferences',
    'notify.check.status'
  ];

  for (const roleName of rolesToFix) {
    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) {
      console.log(`${roleName} not found`);
      continue;
    }

    for (const permId of permsToInject) {
      const perm = await prisma.permission.findUnique({ where: { id: permId } });
      if (!perm) {
        console.log(`Permission ${permId} not found mapped`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: { role_id: role.id, permission_id: perm.id }
        },
        update: {},
        create: { role_id: role.id, permission_id: perm.id }
      }).catch(async (e) => {
        // Fallback for missing unique constraint
        const exists = await prisma.rolePermission.findFirst({ where: { role_id: role.id, permission_id: perm.id } });
        if (!exists) {
          await prisma.rolePermission.create({ data: { role_id: role.id, permission_id: perm.id } });
        }
      });
      console.log(`Injected ${permId} to ${roleName}`);
    }
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
