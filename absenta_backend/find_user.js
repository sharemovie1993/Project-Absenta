const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function findUser() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'trisnawati', mode: 'insensitive' } },
        { full_name: { contains: 'trisnawati', mode: 'insensitive' } },
      ]
    },
    include: { Role: true }
  });

  console.log('--- FOUND USERS ---');
  users.forEach(u => {
    console.log(`Email: ${u.email} | Name: ${u.full_name} | Role: ${u.Role?.name} | Tenant: ${u.tenant_id}`);
  });

  const gurus = await prisma.guru.findMany({
    where: {
      nama_guru: { contains: 'trisnawati', mode: 'insensitive' }
    },
    include: { User: true }
  });

  console.log('\n--- FOUND GURU RECORDS ---');
  gurus.forEach(g => {
    console.log(`Nama: ${g.nama_guru} | ID: ${g.id} | UserEmail: ${g.User?.email}`);
  });
}

findUser().catch(console.error).finally(() => prisma.$disconnect());
