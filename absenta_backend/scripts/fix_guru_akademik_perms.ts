import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const rolesToFix = ['GURU'];
  const permsToInject = [
    'academic.subjects.view.list',
    'academic.students.view.list',
    'academic.classes.view.list',
    'attendance.schedules.create'
  ];

  for (const roleName of rolesToFix) {
    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) {
      console.log(`${roleName} not found`);
      continue;
    }

    for (const permId of permsToInject) {
      // Create permission if not exists (in case it's missed in DB)
      let perm = await prisma.permission.findUnique({ where: { id: permId } });
      if (!perm) {
        perm = await prisma.permission.create({ data: { id: permId, description: `Action: ${permId}` } });
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
