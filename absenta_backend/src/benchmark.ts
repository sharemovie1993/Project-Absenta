import { PrismaClient } from '@prisma/client';
import { DashboardKaprogStatsService } from './modules/dashboard/services/sub/dashboard-kaprog-stats.service';

const prisma = new PrismaClient();
const service = new DashboardKaprogStatsService();

async function benchmark() {
  const targetJurusanId = 'c7018bcd-0c32-4f5f-8ffb-cdac83f75a42';
  const jur = await prisma.jurusan.findUnique({ where: { id: targetJurusanId } });
  const user = await prisma.user.findFirst({ where: { email: { contains: 'kaprog', mode: 'insensitive' } } }) || await prisma.user.findFirst();

  console.time('TOTAL_API_EXECUTION_TIME');
  const res = await service.getKaprogStats(jur!.tenant_id, user!.id, { targetJurusanId });
  console.timeEnd('TOTAL_API_EXECUTION_TIME');
  console.log('Result keys:', Object.keys(res));
}

benchmark().catch(console.error).finally(() => prisma.$disconnect());
