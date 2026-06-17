const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Checking WALIKELAS Assignments ---');
  const assignments = await prisma.organizationalAssignment.findMany({
    where: { Position: { code: 'WALIKELAS' } },
    include: {
      User: {
        include: {
          Guru: true
        }
      },
      Position: true,
      Kelas: true
    }
  });

  if (assignments.length === 0) {
    console.log('❌ No assignments found for WALIKELAS code.');
  } else {
    assignments.forEach(a => {
      console.log(`Assignment ID: ${a.id}`);
      console.log(`- Kelas: ${a.Kelas?.nama_kelas || 'null'}`);
      console.log(`- Guru: ${a.User?.Guru?.nama_guru || 'null'}`);
      console.log(`- Is Active: ${a.is_active}`);
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
