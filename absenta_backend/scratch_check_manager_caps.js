const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- CAPABILITIES FOR MANAJER_TOKO_KOPERASI ---');
  // Find the position first
  const position = await prisma.organizationalPosition.findFirst({
    where: { code: 'MANAJER_TOKO_KOPERASI' }
  });

  if (!position) {
    console.log('MANAJER_TOKO_KOPERASI position not found in database.');
    return;
  }

  console.log(`Position ID: ${position.id}, Code: ${position.code}, Name: ${position.name}`);

  // Find capabilities (OrganizationalCapability) associated with this position
  const caps = await prisma.organizationalCapability.findMany({
    where: { position_id: position.id },
    include: {
      Permission: true
    }
  });

  console.log(`Found ${caps.length} capabilities:`);
  for (const c of caps) {
    console.log(`- ${c.Permission.name} (ID: ${c.Permission.id})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
