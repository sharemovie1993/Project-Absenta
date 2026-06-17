const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMenus() {
  const menus = await prisma.menu.findMany({
    where: { scope: 'TENANT', is_active: true },
    orderBy: { order: 'asc' }
  });

  console.log('--- ACTIVE TENANT MENUS ---');
  menus.forEach(m => {
    console.log(`Order: ${m.order} | Name: ${m.name} | Path: ${m.path}`);
  });

  process.exit(0);
}

checkMenus().catch(err => {
  console.error(err);
  process.exit(1);
});
