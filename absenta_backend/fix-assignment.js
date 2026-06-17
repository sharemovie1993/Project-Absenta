const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update assignment for Asep Sofyan to X-TKJ-1
  const userId = '0094016f-7cd7-46c9-886d-3ac02ee1fee5'; // sofyan@gmail.com
  
  // Find the active Wali Kelas assignment
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
      data: { kelas_id: 'b576114c-8157-401f-9b89-ceab5bb56390' } // X-TKJ-1
    });
    console.log('Assignment updated to X-TKJ-1:', updated);
  } else {
    console.log('Active assignment not found');
  }
}
main().finally(() => prisma.$disconnect());
