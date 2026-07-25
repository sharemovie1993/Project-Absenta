const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPetugasGerbang() {
  console.log('=== SEARCHING FOR PETUGAS GERBANG USERS ===');
  
  const users = await prisma.user.findMany({
    where: {
      Role: {
        name: { in: ['PETUGAS_GERBANG', 'PETUGAS', 'ADMIN', 'GURU', 'SUPERADMIN'] }
      }
    },
    take: 10,
    select: { email: true, full_name: true, Role: { select: { name: true } } }
  });

  console.log('Users with admin/petugas roles:', users);
}

findPetugasGerbang()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
