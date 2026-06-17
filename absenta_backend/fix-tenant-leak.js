const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '0094016f-7cd7-46c9-886d-3ac02ee1fee5'; // sofyan@gmail.com
  
  const assignment = await prisma.organizationalAssignment.findFirst({
    where: { 
      user_id: userId,
      Position: { code: 'WALIKELAS' },
      is_active: true
    }
  });

  if (assignment) {
    const updated = await prisma.organizationalAssignment.update({
      where: { id: assignment.id },
      data: { kelas_id: 'bedde365-b25b-448c-bd90-0083469fd221' } // X TJKT 1 (SMKN 1 PLERED)
    });
    console.log('Assignment fixed to X TJKT 1:', updated);
  }
}
main().finally(() => prisma.$disconnect());
