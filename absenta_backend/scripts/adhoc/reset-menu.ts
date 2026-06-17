
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting Menu and MenuRole data...');

  // Delete MenuRole first due to FK constraint
  const deletedRoles = await prisma.menuRole.deleteMany({});
  console.log(`✅ Deleted ${deletedRoles.count} MenuRole records.`);

  // Delete Menu
  const deletedMenus = await prisma.menu.deleteMany({});
  console.log(`✅ Deleted ${deletedMenus.count} Menu records.`);

  console.log('✨ Menu data reset complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
