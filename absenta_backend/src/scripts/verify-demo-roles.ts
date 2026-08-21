import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'demo-tenant-absenta';
  const roles = await prisma.role.findMany({ where: { tenant_id: tenantId } });

  console.log('=== ROLE BASELINE DI TENANT DEMO ===');
  for (const r of roles) {
    const permCount = await prisma.rolePermission.count({ where: { role_id: r.id } });
    const userCount = await prisma.user.count({ where: { tenant_id: tenantId, role_id: r.id } });
    console.log(`- Role: ${r.name.padEnd(12)} | ID: ${r.id} | Jumlah User: ${userCount} | Permissions: ${permCount}`);
  }

  const assignments = await prisma.organizationalAssignment.count({ where: { tenant_id: tenantId } });
  console.log(`\n=== JABATAN STRUKTURAL ===`);
  console.log(`- Total Penugasan Fungsional (OrganizationalAssignment): ${assignments} penugasan`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
