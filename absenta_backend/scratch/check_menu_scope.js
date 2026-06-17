const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const menus = await prisma.menu.findMany({ 
    where: { 
      OR: [
        { name: { contains: 'Jurusan' } }, 
        { name: { contains: 'Struktur' } }
      ] 
    } 
  });
  console.log('--- Menu Scope Check ---');
  menus.forEach(m => {
    console.log(`[${m.name}] Scope: ${m.scope}, Active: ${m.is_active}, RequiredCap: ${m.required_capability}`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
