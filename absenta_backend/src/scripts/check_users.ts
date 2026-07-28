import { prisma } from '../utils/prisma';
import { AcademicStatsService } from '../modules/academic/services/academic-stats.service';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true, tenant_id: true },
    take: 15
  });
  console.log(`=== CHECK USERS & STATS (${users.length} users) ===`);
  const service = new AcademicStatsService();
  for (const u of users) {
    const tenant = await prisma.tenant.findUnique({ where: { id: u.tenant_id } });
    const stats = await service.getAcademicStats(u.tenant_id);
    console.log(`User: ${u.email} (${u.full_name}) | Tenant: "${tenant?.name}" [${u.tenant_id}]`);
    console.log(`  stats.semester:`, stats.semester);
    console.log(`  stats.tahun_pelajaran:`, stats.tahun_pelajaran);
    console.log(`  stats.active_semester:`, stats.active_semester);
    console.log('---');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
