import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMenus() {
  const menus = await prisma.menu.findMany({
    where: {
      OR: [
        { name: { contains: 'Jurusan', mode: 'insensitive' } },
        { name: { contains: 'Struktur', mode: 'insensitive' } },
        { name: { contains: 'Organisasi', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      path: true,
      required_capability: true
    }
  });

  console.log('--- Menu Audit ---');
  menus.forEach(m => {
    console.log(`[${m.name}] Path: ${m.path}, Required: ${m.required_capability}`);
  });
}

checkMenus().catch(console.error).finally(() => prisma.$disconnect());
