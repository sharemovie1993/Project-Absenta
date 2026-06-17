const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMenus() {
  const menus = await prisma.menu.findMany({
    where: { scope: 'TENANT' },
    orderBy: { order: 'asc' }
  });

  console.log('--- TENANT MENUS ---');
  menus.forEach(m => {
    console.log(`[${m.is_active ? 'ACTIVE' : 'INACTIVE'}] ID: ${m.id} | Name: ${m.name} | Path: ${m.path} | Order: ${m.order}`);
  });

  process.exit(0);
}

checkMenus().catch(err => {
  console.error(err);
  process.exit(1);
});
