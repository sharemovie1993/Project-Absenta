import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Menu scopes and parent relations in the database...\n');
  const menus = await prisma.menu.findMany({
    where: { is_active: true },
    orderBy: { order: 'asc' }
  });

  console.log(`Found ${menus.length} active menus in database.`);

  const platformMenus = menus.filter(m => m.scope === 'PLATFORM');
  const tenantMenus = menus.filter(m => m.scope === 'TENANT');

  console.log(`- Scope PLATFORM: ${platformMenus.length} items`);
  console.log(`- Scope TENANT: ${tenantMenus.length} items\n`);

  console.log('--- PLATFORM MENUS ---');
  for (const m of platformMenus) {
    console.log(`[PLATFORM] ID: ${m.id} | Name: ${m.name} | Path: ${m.path} | Parent ID: ${m.parent_id}`);
  }

  console.log('\n--- TENANT MENUS (Sample) ---');
  for (const m of tenantMenus.slice(0, 15)) {
    console.log(`[TENANT] ID: ${m.id} | Name: ${m.name} | Path: ${m.path} | Parent ID: ${m.parent_id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
