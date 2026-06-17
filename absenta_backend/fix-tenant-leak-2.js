const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '0094016f-7cd7-46c9-886d-3ac02ee1fee5'; 
  
  // delete all assignments for Asep as WALIKELAS
  await prisma.organizationalAssignment.deleteMany({
    where: { 
      user_id: userId,
      Position: { code: 'WALIKELAS' }
    }
  });

  // Create a fresh assignment to X TJKT 1
  const pos = await prisma.organizationalPosition.findFirst({ where: { code: 'WALIKELAS' } });
  
  const updated = await prisma.organizationalAssignment.create({
    data: {
      tenant_id: '44497b2b-a4f2-42c5-805b-105db58a6415',
      user_id: userId,
      position_id: pos.id,
      kelas_id: 'bedde365-b25b-448c-bd90-0083469fd221', // X TJKT 1
      start_date: new Date(),
      is_active: true
    }
  });
  console.log('Assignment fixed to X TJKT 1:', updated);
}
main().finally(() => prisma.$disconnect());
