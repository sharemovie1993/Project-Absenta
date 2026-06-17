import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const role = await prisma.role.findFirst({ where: { name: 'SISWA' } });
  if (!role) return console.log('Siswa role not found');

  const perm = await prisma.permission.findFirst({ where: { id: 'attendance.reports.view' } });
  if (!perm) return console.log('attendance.reports.view permission not found');

  const existing = await prisma.rolePermission.findFirst({
    where: { role_id: role.id, permission_id: perm.id }
  });

  if (!existing) {
    console.log('Inserting attendance.reports.view for SISWA');
    await prisma.rolePermission.create({
      data: { role_id: role.id, permission_id: perm.id }
    });
  } else {
    console.log('attendance.reports.view already exists for SISWA');
  }

  const caps = await prisma.rolePermission.findMany({
    where: { role_id: role.id },
    select: { permission_id: true }
  });
  console.log('Total SISWA caps:', caps.length);
  console.log('Includes reports.view:', caps.some(c => c.permission_id === 'attendance.reports.view'));
}

fix().catch(console.error).finally(() => prisma.$disconnect());
