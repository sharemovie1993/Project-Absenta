const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const positions = await prisma.organizationalPosition.findMany({
    select: { code: true, name: true }
  });
  const unique = {};
  positions.forEach(p => {
    if (!unique[p.code]) {
      unique[p.code] = new Set();
    }
    unique[p.code].add(p.name);
  });
  console.log('Unique Codes & Names:');
  Object.keys(unique).forEach(k => {
    console.log(`- Code: ${k} | Names:`, Array.from(unique[k]));
  });
}
main().finally(() => prisma.$disconnect());
