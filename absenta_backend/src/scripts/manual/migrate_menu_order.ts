import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setOrderByPath(path: string, order: number) {
  const res = await prisma.menu.updateMany({
    where: { path },
    data: { order }
  });
  console.log(`[ORDER] ${path} -> ${order} (affected: ${res.count})`);
}

async function main() {
  console.log('=== UPDATE MENU ORDER (idempotent) ===');
  await setOrderByPath('/dashboard', 1);
  await setOrderByPath('/services', 2);
  await setOrderByPath('/billing/my-subscription', 3);
  await setOrderByPath('/menu/akademik', 10);
  await setOrderByPath('/menu/data-master', 11);
  await setOrderByPath('/menu/attendance', 20);
  await setOrderByPath('/menu/cooperative', 21);
  await setOrderByPath('/menu/billing', 90);
  await setOrderByPath('/settings', 100);
  console.log('=== DONE ===');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
