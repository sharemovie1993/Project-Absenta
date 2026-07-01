import { prisma } from '../utils/prisma';

async function main() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log('--- TENANTS & ACTIVE CLASSES ---');
    for (const t of tenants) {
      const total = await prisma.kelas.count({ where: { tenant_id: t.id } });
      const active = await prisma.kelas.count({ where: { tenant_id: t.id, is_active: true } });
      const grouped = await prisma.kelas.groupBy({
        by: ['tingkat'],
        where: { tenant_id: t.id, is_active: true },
        _count: { id: true }
      });
      console.log(`Tenant: ${t.name} (${t.id})`);
      console.log(`  Total Kelas: ${total}`);
      console.log(`  Active Kelas: ${active}`);
      console.log(`  Grouped Active:`, JSON.stringify(grouped));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
