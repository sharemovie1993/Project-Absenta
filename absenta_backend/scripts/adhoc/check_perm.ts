
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.permission.findUnique({ where: { id: 'notify.view.stats' } });
  console.log('Permission:', p);
  const pList = await prisma.permission.findMany({ where: { group: 'notify' } });
  console.log('Notify Group Count:', pList.length);
  console.log('Notify Group IDs:', pList.map(x => x.id));
}
main().catch(console.error).finally(() => prisma.$disconnect());
