const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      full_name: {
        contains: 'reyna',
        mode: 'insensitive'
      }
    }
  });
  console.log('Users:', JSON.stringify(users.map(u => ({ email: u.email, name: u.full_name, id: u.id })), null, 2));

  const siswa = await prisma.siswa.findMany({
    where: {
      nama: {
        contains: 'reyna',
        mode: 'insensitive'
      }
    }
  });
  console.log('Siswa:', JSON.stringify(siswa.map(s => ({ nis: s.nis, nama: s.nama, email: s.email, id: s.id })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
